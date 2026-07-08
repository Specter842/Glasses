import type { RenderedClass, RenderedDay, Course } from "./types";
import { type DB, getCourseMap, getSlotsForDay } from "./store";
import { dayOfWeek, timeToMinutes, addDays } from "./time";

// Turn the recurring TimetableSlot template + any DateOverrides + any
// materialized ClassInstances into the concrete list of classes that render
// for each date. Single source of truth for "what's on" a day.
//
// Precedence for a given date:
//   1. If ClassInstance rows exist for the date, they are authoritative
//      (this is how CLEARED days show cancelled classes, and how COPY_FROM_DAY
//      days show the copied classes).
//   2. Else if a CLEARED override exists, the day shows nothing.
//   3. Else render straight off the weekly template for that day-of-week.

function sortClasses(a: RenderedClass, b: RenderedClass): number {
  const t = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  return t !== 0 ? t : a.courseName.localeCompare(b.courseName);
}

export function renderDays(db: DB, dates: string[]): RenderedDay[] {
  if (!db.semester) {
    return dates.map((date) => ({
      date,
      dayOfWeek: dayOfWeek(date),
      cleared: false,
      copiedFromDayOfWeek: null,
      classes: [],
    }));
  }

  const courses = getCourseMap(db);
  const overrideByDate = new Map(db.overrides.map((o) => [o.date, o]));
  const instancesByDate = new Map<string, typeof db.instances>();
  for (const inst of db.instances) {
    const list = instancesByDate.get(inst.date) ?? [];
    list.push(inst);
    instancesByDate.set(inst.date, list);
  }

  return dates.map((date) => {
    const dow = dayOfWeek(date);
    const override = overrideByDate.get(date) ?? null;
    const dayInstances = instancesByDate.get(date) ?? [];

    let classes: RenderedClass[];

    if (dayInstances.length > 0) {
      classes = dayInstances.map((inst) =>
        toRendered(
          courses.get(inst.course_id),
          inst.course_id,
          date,
          inst.start_time,
          inst.end_time,
          null,
          inst.status,
          inst.id,
        ),
      );
    } else if (override?.kind === "CLEARED") {
      classes = [];
    } else {
      classes = getSlotsForDay(db, dow).map((slot) =>
        toRendered(
          courses.get(slot.course_id),
          slot.course_id,
          date,
          slot.start_time,
          slot.end_time,
          slot.location,
          "SCHEDULED",
          null,
        ),
      );
    }

    classes.sort(sortClasses);

    return {
      date,
      dayOfWeek: dow,
      cleared: override?.kind === "CLEARED",
      copiedFromDayOfWeek:
        override?.kind === "COPY_FROM_DAY"
          ? override.source_day_of_week
          : null,
      classes,
    };
  });
}

/**
 * Class occurrences on or before `toDate` (from `fromDate`) that still have
 * status SCHEDULED — i.e. past classes awaiting an attendance mark. Cleared and
 * already-marked classes are excluded.
 */
export function pendingAttendance(
  db: DB,
  fromDate: string,
  toDate: string,
): RenderedClass[] {
  if (fromDate > toDate) return [];
  const dates: string[] = [];
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) dates.push(d);
  const out: RenderedClass[] = [];
  for (const day of renderDays(db, dates)) {
    for (const c of day.classes) {
      if (c.status === "SCHEDULED") out.push(c);
    }
  }
  return out;
}

function toRendered(
  course: Course | undefined,
  courseId: number,
  date: string,
  startTime: string,
  endTime: string,
  location: string | null,
  status: RenderedClass["status"],
  instanceId: number | null,
): RenderedClass {
  return {
    instanceId,
    courseId,
    courseName: course?.name ?? "Unknown course",
    courseType: course?.type ?? "LECTURE",
    color: course?.color ?? "#9A9A9A",
    date,
    startTime,
    endTime,
    location,
    status,
  };
}
