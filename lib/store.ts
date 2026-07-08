import type {
  Semester,
  Course,
  CourseType,
  TimetableSlot,
  DateOverride,
  ClassInstance,
  Task,
  LearningGoal,
  LearningResource,
  GoalStatus,
} from "./types";
import { dayOfWeek } from "./time";

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
  tasks: Task[];
  goals: LearningGoal[];
  resources: LearningResource[];
  seq: number; // auto-increment id source
}

export function emptyDB(): DB {
  return {
    semester: null,
    courses: [],
    slots: [],
    overrides: [],
    instances: [],
    tasks: [],
    goals: [],
    resources: [],
    seq: 1,
  };
}

function nextId(db: DB): number {
  return db.seq++;
}

function nowISO(): string {
  return new Date().toISOString();
}

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

  return db;
}

/** Fill in any missing top-level collections from an older persisted shape. */
export function normalizeDB(input: unknown): DB {
  const base = emptyDB();
  if (!input || typeof input !== "object") return base;
  const d = input as Partial<DB>;
  // Migrate the old two-type model: "LAB" became "PRACTICAL", and courses
  // gained a `code`.
  const courses = (d.courses ?? []).map((c) => ({
    ...c,
    code: c.code ?? null,
    type: ((c.type as string) === "LAB" ? "PRACTICAL" : c.type) as CourseType,
  }));
  return {
    semester: d.semester ?? null,
    courses,
    slots: d.slots ?? [],
    overrides: d.overrides ?? [],
    instances: d.instances ?? [],
    tasks: d.tasks ?? [],
    goals: d.goals ?? [],
    resources: d.resources ?? [],
    seq: d.seq ?? base.seq,
  };
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

export type { LearningGoal, LearningResource };
