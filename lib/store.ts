import type {
  Semester,
  Course,
  CourseType,
  TimetableSlot,
  DateOverride,
  ClassInstance,
  CalendarEvent,
  Task,
  Habit,
  HabitLog,
  Account,
  Category,
  Transaction,
  TxKind,
  Budget,
  Recurring,
  RecurFrequency,
  WishlistItem,
  Settings,
  LearningGoal,
  LearningResource,
  GoalStatus,
  Note,
} from "./types";
import { dayOfWeek, toISODate } from "./time";
// money.ts imports only the DB *type* from here, so this is not a runtime cycle.
import { materialiseRecurring } from "./money";

// ---------------------------------------------------------------------------
// On-device data store.
//
// The whole dataset (single user, a handful of records) lives in one JSON
// document persisted via Capacitor Preferences — localStorage in the browser,
// native storage on Android. No server, no network: fully offline.
// Mutations are plain functions that mutate a draft DB; the DataProvider clones
// state, applies one, persists, and re-renders.
// ---------------------------------------------------------------------------

export interface DB {
  semester: Semester | null;
  courses: Course[];
  slots: TimetableSlot[];
  overrides: DateOverride[];
  instances: ClassInstance[];
  events: CalendarEvent[];
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: Recurring[];
  wishlist: WishlistItem[];
  goals: LearningGoal[];
  resources: LearningResource[];
  notes: Note[];
  settings: Settings;
  seq: number; // auto-increment id source
}

export function emptyDB(): DB {
  return {
    semester: null,
    courses: [],
    slots: [],
    overrides: [],
    instances: [],
    events: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    recurring: [],
    wishlist: [],
    goals: [],
    resources: [],
    notes: [],
    settings: { currency: "₹" },
    seq: 1,
  };
}

function nextId(db: DB): number {
  return db.seq++;
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Starter wallet + categories, so the Money screen is usable on first open. */
export function seedFinanceDefaults(db: DB) {
  if (db.accounts.length === 0) {
    db.accounts.push({
      id: nextId(db),
      name: "Cash",
      color: "#17C964",
      opening_balance: 0,
      created_at: nowISO(),
    });
  }
  if (db.categories.length > 0) return;
  const expense = [
    "Food",
    "Groceries",
    "Transport",
    "Shopping",
    "Bills",
    "Health",
    "Entertainment",
    "Education",
    "Other",
  ];
  const income = ["Allowance", "Salary", "Other"];
  expense.forEach((name, i) =>
    db.categories.push({
      id: nextId(db),
      name,
      kind: "EXPENSE",
      color: FINANCE_COLORS[i % FINANCE_COLORS.length],
    }),
  );
  income.forEach((name, i) =>
    db.categories.push({
      id: nextId(db),
      name,
      kind: "INCOME",
      color: FINANCE_COLORS[(i + 1) % FINANCE_COLORS.length],
    }),
  );
}

const FINANCE_COLORS = [
  "#2E5BFF",
  "#FF2D55",
  "#17C964",
  "#5B8CFF",
  "#E11030",
  "#37FF8B",
  "#FFFFFF",
];

// ---- First-run sample data (mirrors the earlier demo seed) ----

export function seedDB(): DB {
  const db = emptyDB();
  const sem: Semester = {
    id: nextId(db),
    name: "Semester 5 — Autumn 2026",
    start_date: "2026-07-01",
    end_date: "2026-11-30",
  };
  db.semester = sem;

  const course = (
    name: string,
    type: CourseType,
    color: string,
    threshold = 75,
  ): number => {
    const id = nextId(db);
    db.courses.push({
      id,
      semester_id: sem.id,
      name,
      code: null,
      type,
      color,
      attendance_threshold_pct: threshold,
    });
    return id;
  };

  const ds = course("Data Structures", "LECTURE", "#2E5BFF");
  const algo = course("Algorithms", "LECTURE", "#5B8CFF");
  const os = course("Operating Systems", "LECTURE", "#FF2D55");
  const dsLab = course("DS Lab", "PRACTICAL", "#17C964");
  const osLab = course("OS Lab", "PRACTICAL", "#37FF8B");

  const slot = (
    courseId: number,
    dow: number,
    start: string,
    end: string,
    loc: string,
  ) => {
    db.slots.push({
      id: nextId(db),
      course_id: courseId,
      day_of_week: dow,
      start_time: start,
      end_time: end,
      location: loc,
    });
  };
  // 0=Sun .. 6=Sat
  slot(ds, 1, "09:00", "10:00", "R101");
  slot(algo, 1, "10:15", "11:15", "R101");
  slot(dsLab, 1, "14:00", "16:00", "Lab A");
  slot(os, 2, "09:00", "10:00", "R102");
  slot(ds, 2, "10:15", "11:15", "R101");
  slot(osLab, 2, "14:00", "16:00", "Lab B");
  slot(algo, 3, "09:00", "10:00", "R101");
  slot(os, 3, "10:15", "11:15", "R102");
  slot(ds, 4, "09:00", "10:00", "R101");
  slot(dsLab, 4, "14:00", "16:00", "Lab A");
  slot(algo, 5, "09:00", "10:00", "R101");
  slot(os, 5, "10:15", "11:15", "R102");

  seedFinanceDefaults(db);
  return db;
}

/** Fill in any missing top-level collections from an older persisted shape. */
export function normalizeDB(input: unknown): DB {
  const base = emptyDB();
  if (!input || typeof input !== "object") {
    seedFinanceDefaults(base);
    return base;
  }
  const d = input as Partial<DB>;
  // Migrate the old two-type model: "LAB" became "PRACTICAL", and courses
  // gained a `code`.
  const courses = (d.courses ?? []).map((c) => ({
    ...c,
    code: c.code ?? null,
    type: ((c.type as string) === "LAB" ? "PRACTICAL" : c.type) as CourseType,
  }));
  const next: DB = {
    semester: d.semester ?? null,
    courses,
    slots: d.slots ?? [],
    overrides: d.overrides ?? [],
    instances: d.instances ?? [],
    // Added later; older saved documents won't have these.
    events: d.events ?? [],
    tasks: d.tasks ?? [],
    habits: d.habits ?? [],
    habitLogs: d.habitLogs ?? [],
    accounts: d.accounts ?? [],
    categories: d.categories ?? [],
    transactions: d.transactions ?? [],
    budgets: d.budgets ?? [],
    recurring: d.recurring ?? [],
    wishlist: d.wishlist ?? [],
    goals: d.goals ?? [],
    resources: d.resources ?? [],
    notes: d.notes ?? [],
    settings: { currency: d.settings?.currency || "₹" },
    seq: d.seq ?? base.seq,
  };

  // A document saved before finance existed has no `categories` key at all.
  // Give it the starter set. An *empty* array means the user deleted them —
  // leave that alone.
  if (d.categories === undefined) seedFinanceDefaults(next);
  return next;
}

// ===========================================================================
// Selectors (read helpers)
// ===========================================================================

export function getCourses(db: DB): Course[] {
  return [...db.courses].sort((a, b) => a.name.localeCompare(b.name));
}

export function getCourseMap(db: DB): Map<number, Course> {
  const map = new Map<number, Course>();
  for (const c of db.courses) map.set(c.id, c);
  return map;
}

export function getSlots(db: DB): TimetableSlot[] {
  return [...db.slots].sort(
    (a, b) =>
      a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time),
  );
}

export function getSlotsForDay(db: DB, dow: number): TimetableSlot[] {
  return db.slots
    .filter((s) => s.day_of_week === dow)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export function getOverride(db: DB, date: string): DateOverride | null {
  return db.overrides.find((o) => o.date === date) ?? null;
}

export function getInstancesForDate(db: DB, date: string): ClassInstance[] {
  return db.instances
    .filter((i) => i.date === date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export function getTasksSorted(db: DB): Task[] {
  return [...db.tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done - b.done;
    const ad = a.due_date === null ? 1 : 0;
    const bd = b.due_date === null ? 1 : 0;
    if (ad !== bd) return ad - bd;
    if (a.due_date && b.due_date && a.due_date !== b.due_date)
      return a.due_date < b.due_date ? -1 : 1;
    return a.created_at < b.created_at ? -1 : 1;
  });
}

// ===========================================================================
// Mutations (operate on a draft DB in place)
// ===========================================================================

function upsertOverride(
  db: DB,
  date: string,
  kind: DateOverride["kind"],
  source: number | null,
) {
  const existing = db.overrides.find((o) => o.date === date);
  if (existing) {
    existing.kind = kind;
    existing.source_day_of_week = source;
  } else {
    db.overrides.push({
      id: nextId(db),
      date,
      kind,
      source_day_of_week: source,
    });
  }
}

/** Clear a date: mark all its classes CANCELLED (materialising the template if
 *  none exist yet). Cancelled classes are excluded from attendance maths. */
export function clearSchedule(db: DB, date: string) {
  upsertOverride(db, date, "CLEARED", null);
  const existing = db.instances.filter((i) => i.date === date);
  if (existing.length > 0) {
    for (const i of existing) i.status = "CANCELLED";
  } else if (db.semester) {
    const dow = dayOfWeek(date);
    for (const slot of getSlotsForDay(db, dow)) {
      db.instances.push({
        id: nextId(db),
        course_id: slot.course_id,
        date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: "CANCELLED",
      });
    }
  }
}

/** Copy a weekday's template onto a date, materialising fresh SCHEDULED
 *  instances. */
export function duplicateDay(db: DB, targetDate: string, sourceDow: number) {
  if (!db.semester) return;
  upsertOverride(db, targetDate, "COPY_FROM_DAY", sourceDow);
  db.instances = db.instances.filter((i) => i.date !== targetDate);
  for (const slot of getSlotsForDay(db, sourceDow)) {
    db.instances.push({
      id: nextId(db),
      course_id: slot.course_id,
      date: targetDate,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: "SCHEDULED",
    });
  }
}

/** Remove any override + instances for a date, back to the plain template. */
export function resetDay(db: DB, date: string) {
  db.overrides = db.overrides.filter((o) => o.date !== date);
  db.instances = db.instances.filter((i) => i.date !== date);
}

export interface Occurrence {
  courseId: number;
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Record attendance for one class occurrence. Template classes have no
 * ClassInstance yet, so this materialises one keyed by (course, date, start).
 * ATTENDED / ABSENT count toward the course; CANCELLED and SCHEDULED do not.
 */
export function markAttendance(
  db: DB,
  occ: Occurrence,
  status: "ATTENDED" | "ABSENT" | "CANCELLED" | "SCHEDULED",
) {
  const existing = db.instances.find(
    (i) =>
      i.course_id === occ.courseId &&
      i.date === occ.date &&
      i.start_time === occ.startTime,
  );
  if (existing) {
    existing.status = status;
  } else {
    db.instances.push({
      id: nextId(db),
      course_id: occ.courseId,
      date: occ.date,
      start_time: occ.startTime,
      end_time: occ.endTime,
      status,
    });
  }
}

export function getCourseInstances(db: DB, courseId: number): ClassInstance[] {
  return db.instances.filter((i) => i.course_id === courseId);
}

// ---- Tasks ----

export function addTask(
  db: DB,
  input: { title: string; dueDate?: string | null; notes?: string | null },
) {
  const title = input.title.trim();
  if (!title) return;
  db.tasks.push({
    id: nextId(db),
    title,
    notes: input.notes?.trim() || null,
    due_date: input.dueDate || null,
    done: 0,
    created_at: nowISO(),
    completed_at: null,
  });
}

export function updateTask(
  db: DB,
  input: {
    id: number;
    title: string;
    dueDate?: string | null;
    notes?: string | null;
  },
) {
  const t = db.tasks.find((x) => x.id === input.id);
  if (!t) return;
  const title = input.title.trim();
  if (!title) return;
  t.title = title;
  t.due_date = input.dueDate || null;
  t.notes = input.notes?.trim() || null;
}

export function toggleTask(db: DB, id: number, done: boolean) {
  const t = db.tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = done ? 1 : 0;
  t.completed_at = done ? nowISO() : null;
}

export function deleteTask(db: DB, id: number) {
  db.tasks = db.tasks.filter((t) => t.id !== id);
}

/**
 * How long an undated task may sit before it counts as overdue. A task with no
 * deadline still shouldn't linger forever, so it ages out on its own.
 */
export const NO_DEADLINE_GRACE_HOURS = 36;

/**
 * Overdue means: still open, and either past its due date, or — with no due
 * date — created more than NO_DEADLINE_GRACE_HOURS ago. A dated task is only
 * late once the due day has fully passed, so "due today" reads as on time.
 * Done tasks are never overdue.
 */
export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (task.done === 1) return false;
  if (task.due_date !== null) return task.due_date < toISODate(now);
  const created = new Date(task.created_at).getTime();
  if (Number.isNaN(created)) return false; // undateable row: never nag
  return now.getTime() - created > NO_DEADLINE_GRACE_HOURS * 3600_000;
}

/**
 * Drop tasks that were completed on a previous day. A task ticked off today
 * stays visible for the rest of today, then is purged at the next new day.
 * Called once by DataProvider after load; returns how many were removed.
 */
export function purgeOldDoneTasks(db: DB, today: string): number {
  const before = db.tasks.length;
  db.tasks = db.tasks.filter((t) => {
    if (t.done !== 1) return true;
    const completedDay = (t.completed_at ?? "").slice(0, 10);
    return !completedDay || completedDay >= today; // keep today's; drop older
  });
  return before - db.tasks.length;
}

// ---- Semester / courses / slots ----

export function saveSemester(
  db: DB,
  input: { name: string; startDate: string; endDate: string },
) {
  const name = input.name.trim();
  if (!name) return;
  if (db.semester) {
    db.semester.name = name;
    db.semester.start_date = input.startDate;
    db.semester.end_date = input.endDate;
  } else {
    db.semester = {
      id: nextId(db),
      name,
      start_date: input.startDate,
      end_date: input.endDate,
    };
  }
}

export function addCourse(
  db: DB,
  input: {
    name: string;
    type: CourseType;
    color: string;
    thresholdPct: number;
  },
) {
  if (!db.semester) return;
  const name = input.name.trim();
  if (!name) return;
  db.courses.push({
    id: nextId(db),
    semester_id: db.semester.id,
    name,
    code: null,
    type: input.type,
    color: input.color,
    attendance_threshold_pct: Math.round(input.thresholdPct) || 75,
  });
}

export function updateCourseThreshold(db: DB, id: number, thresholdPct: number) {
  const c = db.courses.find((x) => x.id === id);
  if (!c) return;
  c.attendance_threshold_pct = Math.round(thresholdPct) || 0;
}

export function deleteCourse(db: DB, id: number) {
  db.courses = db.courses.filter((c) => c.id !== id);
  db.slots = db.slots.filter((s) => s.course_id !== id);
  db.instances = db.instances.filter((i) => i.course_id !== id);
}

export function addSlot(
  db: DB,
  input: {
    courseId: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location?: string | null;
  },
) {
  db.slots.push({
    id: nextId(db),
    course_id: input.courseId,
    day_of_week: input.dayOfWeek,
    start_time: input.startTime,
    end_time: input.endTime,
    location: input.location?.trim() || null,
  });
}

export function deleteSlot(db: DB, id: number) {
  db.slots = db.slots.filter((s) => s.id !== id);
}

// ---- Whole-timetable delete ----

/**
 * Wipe courses, slots, instances and overrides. Tasks and learning goals
 * survive. Destructive: attendance history goes with the courses it refers to.
 */
export function clearTimetable(db: DB) {
  db.courses = [];
  db.slots = [];
  db.instances = [];
  db.overrides = [];
}

// ---- Habits ----
//
// A HabitLog row existing for (habit, date) means "done that day". Toggling
// adds or removes the row, so there is no third state to reconcile.

/** Palette-restricted colours offered when creating a habit or event. */
export const PALETTE = [
  "#2E5BFF",
  "#17C964",
  "#FF2D55",
  "#5B8CFF",
  "#37FF8B",
  "#E11030",
  "#FFFFFF",
];

export function getHabits(db: DB): Habit[] {
  return [...db.habits].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

/** habit id -> set of ISO dates it was completed on. Built once per render. */
export function habitLogIndex(db: DB): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const log of db.habitLogs) {
    let set = map.get(log.habit_id);
    if (!set) {
      set = new Set();
      map.set(log.habit_id, set);
    }
    set.add(log.date);
  }
  return map;
}

/** How many days in the month containing `monthISO` this habit was done. */
export function habitMonthCount(
  dates: Set<string> | undefined,
  monthPrefix: string,
): number {
  if (!dates) return 0;
  let n = 0;
  for (const d of dates) if (d.startsWith(monthPrefix)) n++;
  return n;
}

export function addHabit(db: DB, input: { name: string; color: string }) {
  const name = input.name.trim();
  if (!name) return;
  db.habits.push({
    id: nextId(db),
    name,
    color: input.color,
    created_at: nowISO(),
  });
}

export function deleteHabit(db: DB, id: number) {
  db.habits = db.habits.filter((h) => h.id !== id);
  db.habitLogs = db.habitLogs.filter((l) => l.habit_id !== id);
}

/** Mark done / not done. Idempotent per (habit, date). */
export function toggleHabit(db: DB, habitId: number, date: string) {
  const existing = db.habitLogs.findIndex(
    (l) => l.habit_id === habitId && l.date === date,
  );
  if (existing >= 0) {
    db.habitLogs.splice(existing, 1);
  } else {
    db.habitLogs.push({ id: nextId(db), habit_id: habitId, date });
  }
}

// ---- Calendar events ----
//
// One-off entries alongside the timetable. Never touch attendance.

export function getEventsForDate(db: DB, date: string): CalendarEvent[] {
  return db.events.filter((e) => e.date === date).sort(compareEvents);
}

/** All-day events first, then by start time. */
export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (!a.start_time && !b.start_time) return a.title.localeCompare(b.title);
  if (!a.start_time) return -1;
  if (!b.start_time) return 1;
  return a.start_time.localeCompare(b.start_time);
}

export function addEvent(
  db: DB,
  input: {
    date: string;
    title: string;
    startTime?: string | null;
    endTime?: string | null;
    note?: string | null;
    color: string;
  },
) {
  const title = input.title.trim();
  if (!title || !input.date) return;
  db.events.push({
    id: nextId(db),
    date: input.date,
    title,
    start_time: input.startTime || null,
    end_time: input.endTime || null,
    note: input.note?.trim() || null,
    color: input.color,
  });
}

export function deleteEvent(db: DB, id: number) {
  db.events = db.events.filter((e) => e.id !== id);
}

// ---- Finance: accounts, categories, transactions ----

export function getAccounts(db: DB): Account[] {
  return [...db.accounts].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

export function getCategories(db: DB, kind?: TxKind): Category[] {
  return db.categories
    .filter((c) => !kind || c.kind === kind)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Newest first: date desc, then insertion order desc. */
export function getTransactions(db: DB, monthPrefix?: string): Transaction[] {
  return db.transactions
    .filter((t) => !monthPrefix || t.date.startsWith(monthPrefix))
    .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : b.id - a.id));
}

/** Opening balance plus every income minus every expense on that account. */
export function accountBalance(db: DB, accountId: number): number {
  const acct = db.accounts.find((a) => a.id === accountId);
  if (!acct) return 0;
  let bal = acct.opening_balance;
  for (const t of db.transactions) {
    if (t.account_id !== accountId) continue;
    bal += t.kind === "INCOME" ? t.amount : -t.amount;
  }
  return bal;
}

/** An account or category can only be deleted once nothing references it. */
export function accountInUse(db: DB, id: number): boolean {
  return db.transactions.some((t) => t.account_id === id);
}
export function categoryInUse(db: DB, id: number): boolean {
  return db.transactions.some((t) => t.category_id === id);
}

export function addAccount(
  db: DB,
  input: { name: string; color: string; openingBalance: number },
) {
  const name = input.name.trim();
  if (!name) return;
  db.accounts.push({
    id: nextId(db),
    name,
    color: input.color,
    opening_balance: Math.round(input.openingBalance) || 0,
    created_at: nowISO(),
  });
}

export function deleteAccount(db: DB, id: number) {
  if (accountInUse(db, id)) return; // guarded in the UI too
  db.accounts = db.accounts.filter((a) => a.id !== id);
}

export function addCategory(
  db: DB,
  input: { name: string; kind: TxKind; color: string },
) {
  const name = input.name.trim();
  if (!name) return;
  const dupe = db.categories.some(
    (c) => c.kind === input.kind && c.name.toLowerCase() === name.toLowerCase(),
  );
  if (dupe) return;
  db.categories.push({ id: nextId(db), name, kind: input.kind, color: input.color });
}

export function deleteCategory(db: DB, id: number) {
  if (categoryInUse(db, id)) return;
  db.categories = db.categories.filter((c) => c.id !== id);
}

export function addTransaction(
  db: DB,
  input: {
    date: string;
    kind: TxKind;
    amount: number; // minor units, positive
    accountId: number;
    categoryId: number;
    item: string;
    note?: string | null;
  },
) {
  const item = input.item.trim();
  if (!input.date || !item || input.amount <= 0) return;
  if (!db.accounts.some((a) => a.id === input.accountId)) return;
  if (!db.categories.some((c) => c.id === input.categoryId)) return;
  db.transactions.push({
    id: nextId(db),
    date: input.date,
    kind: input.kind,
    amount: Math.round(input.amount),
    account_id: input.accountId,
    category_id: input.categoryId,
    item,
    note: input.note?.trim() || null,
    created_at: nowISO(),
  });
}

export function deleteTransaction(db: DB, id: number) {
  db.transactions = db.transactions.filter((t) => t.id !== id);
}

export function setCurrency(db: DB, currency: string) {
  const c = currency.trim();
  if (c) db.settings.currency = c;
}

// ---- Wishlist ----
//
// Things to buy. Purely a list — buying is still a manual transaction; nothing
// here touches balances.

/** Outstanding first; within each group NEED before WANT, then oldest first. */
export function getWishlist(db: DB): WishlistItem[] {
  const rank = (w: WishlistItem) =>
    (w.bought ? 2 : 0) + (w.priority === "NEED" ? 0 : 1);
  return [...db.wishlist].sort(
    (a, b) => rank(a) - rank(b) || (a.created_at < b.created_at ? -1 : 1),
  );
}

export function addWishlistItem(
  db: DB,
  input: {
    name: string;
    amount?: number | null;
    priority: WishlistItem["priority"];
    note?: string | null;
  },
) {
  const name = input.name.trim();
  if (!name) return;
  db.wishlist.push({
    id: nextId(db),
    name,
    amount: input.amount && input.amount > 0 ? Math.round(input.amount) : null,
    priority: input.priority,
    note: input.note?.trim() || null,
    bought: false,
    created_at: nowISO(),
  });
}

export function toggleWishlistBought(db: DB, id: number) {
  const w = db.wishlist.find((x) => x.id === id);
  if (w) w.bought = !w.bought;
}

export function deleteWishlistItem(db: DB, id: number) {
  db.wishlist = db.wishlist.filter((w) => w.id !== id);
}

// ---- Budgets (a monthly limit per expense category) ----

export function getBudget(db: DB, categoryId: number): Budget | undefined {
  return db.budgets.find((b) => b.category_id === categoryId);
}

/** Upsert: one budget per category. amount <= 0 removes it. */
export function setBudget(db: DB, categoryId: number, amount: number) {
  const rounded = Math.round(amount);
  db.budgets = db.budgets.filter((b) => b.category_id !== categoryId);
  if (rounded > 0) {
    db.budgets.push({ id: nextId(db), category_id: categoryId, amount: rounded });
  }
}

// ---- Recurring transactions ----
//
// A rule generates real Transactions. Materialisation is deterministic and
// idempotent: `runRecurring` only ever creates occurrences strictly after
// `last_run`, so it can run on every app open without double-charging.

export function getRecurring(db: DB): Recurring[] {
  return [...db.recurring].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1,
  );
}

export function addRecurring(
  db: DB,
  input: {
    kind: TxKind;
    amount: number;
    accountId: number;
    categoryId: number;
    item: string;
    note?: string | null;
    frequency: RecurFrequency;
    dayOfMonth?: number | null;
    dayOfWeek?: number | null;
    startDate: string;
  },
) {
  const item = input.item.trim();
  if (!item || input.amount <= 0 || !input.startDate) return;
  if (!db.accounts.some((a) => a.id === input.accountId)) return;
  if (!db.categories.some((c) => c.id === input.categoryId)) return;
  db.recurring.push({
    id: nextId(db),
    kind: input.kind,
    amount: Math.round(input.amount),
    account_id: input.accountId,
    category_id: input.categoryId,
    item,
    note: input.note?.trim() || null,
    frequency: input.frequency,
    day_of_month: input.frequency === "MONTHLY" ? (input.dayOfMonth ?? 1) : null,
    day_of_week: input.frequency === "WEEKLY" ? (input.dayOfWeek ?? 0) : null,
    start_date: input.startDate,
    last_run: null,
    active: true,
    created_at: nowISO(),
  });
}

export function setRecurringActive(db: DB, id: number, active: boolean) {
  const r = db.recurring.find((x) => x.id === id);
  if (r) r.active = active;
}

export function deleteRecurring(db: DB, id: number) {
  db.recurring = db.recurring.filter((r) => r.id !== id);
}

/**
 * Materialise all due recurring occurrences up to `today` into real
 * transactions, advancing each rule's `last_run`. Idempotent per day. Returns
 * the count created. The DataProvider calls this once after load.
 */
export function runRecurring(db: DB, today: string): number {
  return materialiseRecurring(db.recurring, today, (tx) => {
    db.transactions.push({
      id: nextId(db),
      date: tx.date,
      kind: tx.kind,
      amount: tx.amount,
      account_id: tx.account_id,
      category_id: tx.category_id,
      item: tx.item,
      note: tx.note,
      created_at: nowISO(),
    });
  });
}

// ---- Learning goals & resources ----
//
// Deliberately minimal: a goal holds resources, each one line to add (url,
// title, optional note). No tags, no folders. Progress is a plain ratio.

export function getGoals(db: DB): LearningGoal[] {
  // Newest first.
  return [...db.goals].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getResourcesForGoal(db: DB, goalId: number): LearningResource[] {
  return db.resources.filter((r) => r.learning_goal_id === goalId);
}

/** done / total resources for a goal. */
export function goalProgress(
  db: DB,
  goalId: number,
): { done: number; total: number } {
  const rs = getResourcesForGoal(db, goalId);
  return { done: rs.filter((r) => r.status === "DONE").length, total: rs.length };
}

export function addGoal(
  db: DB,
  input: { title: string; category?: string | null },
) {
  const title = input.title.trim();
  if (!title) return;
  db.goals.push({
    id: nextId(db),
    title,
    category: input.category?.trim() || null,
    status: "NOT_STARTED",
    created_at: nowISO(),
  });
}

export function setGoalStatus(db: DB, id: number, status: GoalStatus) {
  const g = db.goals.find((x) => x.id === id);
  if (g) g.status = status;
}

export function deleteGoal(db: DB, id: number) {
  db.goals = db.goals.filter((g) => g.id !== id);
  db.resources = db.resources.filter((r) => r.learning_goal_id !== id);
}

export function addResource(
  db: DB,
  input: {
    goalId: number;
    url: string;
    title: string;
    note?: string | null;
  },
) {
  const url = input.url.trim();
  const title = input.title.trim();
  if (!title && !url) return;
  db.resources.push({
    id: nextId(db),
    learning_goal_id: input.goalId,
    url,
    title: title || url,
    status: "NOT_STARTED",
    note: input.note?.trim() || null,
  });
}

export function setResourceStatus(db: DB, id: number, status: GoalStatus) {
  const r = db.resources.find((x) => x.id === id);
  if (r) r.status = status;
}

export function deleteResource(db: DB, id: number) {
  db.resources = db.resources.filter((r) => r.id !== id);
}

// ---- Notes ----
//
// Plain free-text jottings that live in the Tracker. No dates, no status —
// just a text body you add, edit, or delete.

export function getNotes(db: DB): Note[] {
  // Newest first.
  return [...db.notes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function addNote(db: DB, input: { text: string }) {
  const text = input.text.trim();
  if (!text) return;
  db.notes.push({ id: nextId(db), text, created_at: nowISO() });
}

export function updateNote(db: DB, input: { id: number; text: string }) {
  const n = db.notes.find((x) => x.id === input.id);
  if (!n) return;
  const text = input.text.trim();
  if (!text) return;
  n.text = text;
}

export function deleteNote(db: DB, id: number) {
  db.notes = db.notes.filter((n) => n.id !== id);
}

export type { LearningGoal, LearningResource, Note };
