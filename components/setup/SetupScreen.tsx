"use client";

import { useData } from "../DataProvider";
import { getCourses, getSlots } from "@/lib/store";
import { SectionTitle } from "../ui";
import { SemesterForm } from "./SemesterForm";
import { CourseManager } from "./CourseManager";
import { SlotManager } from "./SlotManager";
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
