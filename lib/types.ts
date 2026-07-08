// Shared domain types. Mirrors the SQLite schema in lib/db.ts.

export type CourseType = "LECTURE" | "LAB";

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
export interface Course {
  id: number;
  semester_id: number;
  name: string;
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
}
