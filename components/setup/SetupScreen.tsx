"use client";

import { useData } from "../DataProvider";
import { getCourses, getSlots, getRecurringEvents } from "@/lib/store";
import { SectionTitle } from "../ui";
import { SemesterForm } from "./SemesterForm";
import { CourseManager } from "./CourseManager";
import { SlotManager } from "./SlotManager";
import { ImportTimetable } from "./ImportTimetable";
import { ImportHolidays } from "./ImportHolidays";
import { LoadOddSem2026 } from "./LoadOddSem2026";
import { RecurringEventManager } from "./RecurringEventManager";
import { DeleteTimetable } from "./DeleteTimetable";
import { CurrencyForm } from "./CurrencyForm";

export function SetupScreen() {
  const { db, ready } = useData();

  if (!ready) {
    return (
      <p className="py-16 text-center text-sm text-text-secondary">Loading…</p>
    );
  }

  const courses = getCourses(db);
  const slots = getSlots(db);
  const hasTimetable = courses.length > 0 || slots.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Setup
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Add each course, then place it on the weekly timetable. Everything on
          the calendar renders from these, and each course keeps its own
          attendance threshold.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <SectionTitle>Quick load</SectionTitle>
        <LoadOddSem2026 />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>General</SectionTitle>
        <CurrencyForm />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Semester</SectionTitle>
        <SemesterForm semester={db.semester} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Courses</SectionTitle>
        <CourseManager hasSemester={!!db.semester} courses={courses} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Weekly timetable</SectionTitle>
        <SlotManager courses={courses} slots={slots} />
        <ImportTimetable hasSemester={!!db.semester} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Holidays</SectionTitle>
        <ImportHolidays />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Recurring events</SectionTitle>
        <p className="text-sm text-text-secondary">
          Clubs, standing commitments — anything that repeats weekly on your
          timetable but isn't a course (no attendance tracking).
        </p>
        <RecurringEventManager events={getRecurringEvents(db)} />
      </section>

      {hasTimetable && (
        <section className="flex flex-col gap-4">
          <SectionTitle>Danger zone</SectionTitle>
          <DeleteTimetable />
        </section>
      )}
    </div>
  );
}
