// Shared domain types. Mirrors the SQLite schema in lib/db.ts.

// Matches the badges printed on the timetable: Lecture / Tutorial / Practical.
// ("LAB" was the old name for PRACTICAL — migrated in normalizeDB.)
export type CourseType = "LECTURE" | "TUTORIAL" | "PRACTICAL";

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  LECTURE: "Lecture",
  TUTORIAL: "Tutorial",
  PRACTICAL: "Practical",
};

export const COURSE_TYPE_SHORT: Record<CourseType, string> = {
  LECTURE: "Lec",
  TUTORIAL: "Tut",
  PRACTICAL: "Prac",
};

export type ClassStatus = "SCHEDULED" | "ATTENDED" | "ABSENT" | "CANCELLED";

export type OverrideKind = "CLEARED" | "COPY_FROM_DAY";

export type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export interface Semester {
  id: number;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
}

// Attendance is tracked per course, each against its own threshold.
// `code` is the timetable's course code (e.g. UES101T). Each unique code is a
// separately-tracked course — UES101L (lecture) and UES101P (practical) are two
// courses, each needing its own threshold.
export interface Course {
  id: number;
  semester_id: number;
  name: string;
  code: string | null;
  type: CourseType;
  color: string;
  attendance_threshold_pct: number;
}

export interface TimetableSlot {
  id: number;
  course_id: number;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday (JS Date.getDay convention)
  start_time: string; // HH:MM (24h)
  end_time: string; // HH:MM (24h)
  location: string | null;
}

export interface DateOverride {
  id: number;
  date: string; // YYYY-MM-DD
  kind: OverrideKind;
  source_day_of_week: number | null;
}

export interface ClassInstance {
  id: number;
  course_id: number;
  date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
  status: ClassStatus;
}

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  due_date: string | null; // YYYY-MM-DD
  done: number; // 0 | 1 (SQLite boolean)
  created_at: string;
  completed_at: string | null;
  sort_order: number; // manual drag-ranked priority, ascending
}

/** A habit the user tracks daily. */
export interface Habit {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

/** Presence of a row means the habit was completed on that date. */
export interface HabitLog {
  id: number;
  habit_id: number;
  date: string; // YYYY-MM-DD
}

/**
 * A one-off calendar entry that isn't a class: a deadline, a trip, an exam.
 * Never counted toward attendance — the timetable owns that.
 */
export interface CalendarEvent {
  id: number;
  date: string; // YYYY-MM-DD
  title: string;
  start_time: string | null; // HH:MM, null = all-day
  end_time: string | null;
  note: string | null;
  color: string;
}

// ---- Finance ----
//
// Amounts are integer minor units (paise/cents). Never floats: a spending log
// that drifts by rounding is worse than no log.

export type TxKind = "EXPENSE" | "INCOME";

/** A wallet: Cash, Bank, UPI… */
export interface Account {
  id: number;
  name: string;
  color: string;
  opening_balance: number; // minor units
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  kind: TxKind;
  color: string;
}

export interface Transaction {
  id: number;
  date: string; // YYYY-MM-DD
  kind: TxKind;
  amount: number; // minor units, always positive
  account_id: number;
  category_id: number;
  item: string; // "gum" — what the suggestion engine learns from
  note: string | null;
  created_at: string;
}

/** A monthly spending limit on one expense category. */
export interface Budget {
  id: number;
  category_id: number;
  amount: number; // minor units, per month
}

export type RecurFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

/**
 * A rule that materialises real Transactions. `last_run` is the high-water mark:
 * occurrences are only ever generated after it, so opening the app twice in a
 * day can never double-charge.
 */
export interface Recurring {
  id: number;
  kind: TxKind;
  amount: number;
  account_id: number;
  category_id: number;
  item: string;
  note: string | null;
  frequency: RecurFrequency;
  day_of_month: number | null; // MONTHLY; clamped to the month's length
  day_of_week: number | null; // WEEKLY; 0 = Sun
  start_date: string;
  last_run: string | null;
  active: boolean;
  created_at: string;
}

/** Something the user wants or needs to buy. Not a transaction until bought. */
export interface WishlistItem {
  id: number;
  name: string;
  amount: number | null; // estimated cost, minor units
  priority: "NEED" | "WANT";
  note: string | null;
  bought: boolean;
  created_at: string;
}

export interface Settings {
  currency: string;
}

export interface LearningGoal {
  id: number;
  title: string;
  category: string | null;
  status: GoalStatus;
  created_at: string;
}

export interface LearningResource {
  id: number;
  learning_goal_id: number;
  url: string;
  title: string;
  status: GoalStatus;
  note: string | null;
}

export interface Note {
  id: number;
  text: string;
  created_at: string;
}

// A class as rendered on the calendar for a specific date. May be backed by a
// concrete ClassInstance row, or be a "virtual" render straight off the
// recurring TimetableSlot template (no instance materialized yet).
export interface RenderedClass {
  instanceId: number | null;
  courseId: number;
  courseName: string;
  courseType: CourseType;
  color: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  status: ClassStatus;
}

export interface RenderedDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  cleared: boolean;
  copiedFromDayOfWeek: number | null;
  classes: RenderedClass[];
  events: CalendarEvent[];
}
