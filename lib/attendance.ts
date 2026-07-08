import type { Course, ClassInstance } from "./types";

// Per-course attendance + safety margin.
//
// Attendance is judged per course against that course's own threshold — there
// is no weighted "overall". For a course:
//   held      = instances with status ATTENDED or ABSENT   (CANCELLED excluded)
//   attended  = instances with status ATTENDED
//   ratio     = attended / held
// Let t = threshold / 100. The safety-margin numbers:
//   maxMoreSkippable = floor(attended / t - held), clamped at 0
//       — how many more classes you can miss and still stay ≥ threshold.
//   recoverCount     = ceil((t*held - attended) / (1 - t))   (only when under)
//       — how many future classes you must attend in a row to climb back.

export interface CourseAttendance {
  course: Course;
  held: number;
  attended: number;
  absent: number;
  pct: number | null; // 0..100, null when nothing held yet
  threshold: number; // 0..100
  meets: boolean;
  noData: boolean;
  unlimited: boolean; // threshold <= 0 → can skip freely
  maxMoreSkippable: number;
  recoverCount: number | null; // null unless currently under threshold
  recoverImpossible: boolean; // e.g. 100% threshold with an absence on record
}

export function computeCourseAttendance(
  course: Course,
  instances: ClassInstance[],
): CourseAttendance {
  const mine = instances.filter((i) => i.course_id === course.id);
  const held = mine.filter(
    (i) => i.status === "ATTENDED" || i.status === "ABSENT",
  ).length;
  const attended = mine.filter((i) => i.status === "ATTENDED").length;
  const absent = held - attended;

  const t = course.attendance_threshold_pct / 100;
  const noData = held === 0;
  const unlimited = t <= 0;
  const ratio = noData ? null : attended / held;
  const pct = ratio === null ? null : ratio * 100;
  const meets = ratio === null ? true : ratio >= t - 1e-9;

  let maxMoreSkippable = 0;
  if (unlimited) {
    maxMoreSkippable = Infinity;
  } else if (!noData) {
    maxMoreSkippable = Math.max(0, Math.floor(attended / t - held));
  }

  let recoverCount: number | null = null;
  let recoverImpossible = false;
  if (!noData && !unlimited && ratio! < t - 1e-9) {
    if (t >= 1) {
      recoverImpossible = attended < held;
      recoverCount = recoverImpossible ? null : 0;
    } else {
      recoverCount = Math.ceil((t * held - attended) / (1 - t));
    }
  }

  return {
    course,
    held,
    attended,
    absent,
    pct,
    threshold: course.attendance_threshold_pct,
    meets,
    noData,
    unlimited,
    maxMoreSkippable,
    recoverCount,
    recoverImpossible,
  };
}
