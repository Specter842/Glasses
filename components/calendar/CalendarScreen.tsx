"use client";

import { useState } from "react";
import Link from "next/link";
import { useData } from "../DataProvider";
import { getCourses, getSlots, getTasksSorted } from "@/lib/store";
import { renderDays } from "@/lib/schedule";
import { todayISO, weekDates, addDays } from "@/lib/time";
import { CalendarNav } from "./CalendarNav";
import { ScheduleCommand } from "./ScheduleCommand";
import { DayColumn } from "./DayColumn";
import { TaskPanel } from "../tasks/TaskPanel";
import { SectionTitle, cx } from "../ui";

export function CalendarScreen() {
  const { db, ready } = useData();
  const today = todayISO();
  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState<"week" | "day">("day");

  const courses = getCourses(db);
  const slots = getSlots(db);
  const tasks = getTasksSorted(db);

  const dates = view === "week" ? weekDates(anchor) : [anchor];
  const days = renderDays(db, dates);
  const step = view === "week" ? 7 : 1;

  const needsSetup =
    !db.semester || courses.length === 0 || slots.length === 0;

  if (!ready) {
    return (
      <p className="py-16 text-center text-sm text-text-secondary">Loading…</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <SectionTitle>Calendar</SectionTitle>
          {db.semester && (
            <span className="font-mono text-xs text-text-secondary">
              {db.semester.name}
            </span>
          )}
        </div>

        <CalendarNav
          anchor={anchor}
          view={view}
          onPrev={() => setAnchor((a) => addDays(a, -step))}
          onNext={() => setAnchor((a) => addDays(a, step))}
          onToday={() => setAnchor(today)}
          onSetView={setView}
        />

        <ScheduleCommand />

        {needsSetup && (
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
            {!db.semester
              ? "No semester yet. "
              : courses.length === 0
                ? "No courses yet. "
                : "No timetable slots yet. "}
            <Link href="/setup" className="text-accent hover:underline">
              Open Setup
            </Link>{" "}
            to build your timetable.
          </div>
        )}

        <div
          className={cx(
            "grid gap-2",
            view === "week"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7"
              : "grid-cols-1",
          )}
        >
          {days.map((day) => (
            <DayColumn
              key={day.date}
              day={day}
              isToday={day.date === today}
              compact={view === "week"}
            />
          ))}
        </div>
      </section>

      <section>
        <TaskPanel tasks={tasks} />
      </section>
    </div>
  );
}
