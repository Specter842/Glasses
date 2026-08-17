"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { renderDays } from "@/lib/schedule";
import {
  addMonths,
  dayInMonth,
  dayOfWeek as dowOf,
  daysInMonth,
  DAY_NAMES_SHORT,
  formatDayLabel,
  formatMonthYear,
  formatTime,
  startOfMonth,
  todayISO,
} from "@/lib/time";
import { COURSE_TYPE_SHORT } from "@/lib/types";
import type { Course, RenderedClass } from "@/lib/types";
import { cx } from "../ui";

type DayStatus = "attended" | "absent" | "cancelled" | "scheduled" | "none";

function summarize(classes: RenderedClass[]): DayStatus {
  if (classes.length === 0) return "none";
  if (classes.some((c) => c.status === "ABSENT")) return "absent";
  if (classes.some((c) => c.status === "ATTENDED")) return "attended";
  if (classes.every((c) => c.status === "CANCELLED")) return "cancelled";
  return "scheduled";
}

const CELL_STYLE: Record<DayStatus, string> = {
  attended: "border-green bg-green/20 text-green",
  absent: "border-red-neon bg-red-neon/20 text-red-neon",
  cancelled: "border-border bg-surface text-text-secondary opacity-60 line-through",
  scheduled: "border-border border-dashed text-text-secondary",
  none: "border-transparent text-text-secondary/40",
};

/**
 * Tapping a course's attendance card opens this: a month calendar for that
 * course, colouring each date by what actually happened there (attended /
 * absent / cancelled / still-scheduled), reusing renderDays so it matches
 * exactly what the main Calendar screen would show for that date.
 */
export function CourseAttendanceCalendar({
  course,
  onClose,
}: {
  course: Course;
  onClose: () => void;
}) {
  const { db } = useData();
  const today = todayISO();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState<string | null>(null);

  const dayCount = daysInMonth(month);
  const dates = Array.from({ length: dayCount }, (_, i) => dayInMonth(month, i + 1));
  const rendered = renderDays(db, dates);
  const leadBlanks = dowOf(dates[0]);

  const classesByDate = new Map(
    rendered.map((d) => [d.date, d.classes.filter((c) => c.courseId === course.id)]),
  );

  let attendedCount = 0;
  let absentCount = 0;
  for (const classes of classesByDate.values()) {
    const s = summarize(classes);
    if (s === "attended") attendedCount++;
    if (s === "absent") absentCount++;
  }

  const selectedClasses = selected ? (classesByDate.get(selected) ?? []) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: course.color }}
            />
            <span className="truncate text-sm font-medium text-text-primary">
              {course.name}
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between">
          <MonthArrow
            label="Previous month"
            onClick={() => {
              setMonth((m) => addMonths(m, -1));
              setSelected(null);
            }}
          >
            ‹
          </MonthArrow>
          <span className="font-mono text-sm text-text-primary">
            {formatMonthYear(month)}
          </span>
          <MonthArrow
            label="Next month"
            onClick={() => {
              setMonth((m) => addMonths(m, 1));
              setSelected(null);
            }}
          >
            ›
          </MonthArrow>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES_SHORT.map((d) => (
            <div
              key={d}
              className="text-center font-mono text-[10px] text-text-secondary"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: leadBlanks }, (_, i) => (
            <div key={`b${i}`} />
          ))}
          {dates.map((iso) => {
            const classes = classesByDate.get(iso) ?? [];
            const status = summarize(classes);
            const clickable = status !== "none";
            return (
              <button
                key={iso}
                type="button"
                disabled={!clickable}
                aria-label={`${formatDayLabel(iso)}: ${status}`}
                onClick={() => setSelected(iso)}
                className={cx(
                  "flex aspect-square items-center justify-center rounded-md border font-mono text-xs transition-colors",
                  CELL_STYLE[status],
                  clickable && "hover:border-text-secondary",
                  iso === today && "ring-1 ring-accent",
                  selected === iso && "ring-1 ring-white",
                )}
              >
                {Number(iso.slice(8, 10))}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-text-secondary">
          <Legend swatch="border-green bg-green/20" label={`Attended (${attendedCount})`} />
          <Legend swatch="border-red-neon bg-red-neon/20" label={`Absent (${absentCount})`} />
          <Legend swatch="border-border bg-surface opacity-60" label="Cancelled" />
          <Legend swatch="border-border border-dashed" label="Scheduled" />
        </div>

        {selected && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <span className="text-xs font-medium text-text-primary">
              {formatDayLabel(selected)}
            </span>
            {selectedClasses.length === 0 ? (
              <span className="text-xs text-text-secondary">No class this day.</span>
            ) : (
              selectedClasses.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between font-mono text-xs text-text-secondary"
                >
                  <span>
                    {formatTime(c.startTime)}–{formatTime(c.endTime)}{" "}
                    <span className="text-text-secondary/70">
                      ({COURSE_TYPE_SHORT[c.courseType]})
                    </span>
                  </span>
                  <span
                    className={cx(
                      c.status === "ATTENDED" && "text-green",
                      c.status === "ABSENT" && "text-red-neon",
                    )}
                  >
                    {c.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cx("h-2.5 w-2.5 rounded-sm border", swatch)} />
      {label}
    </span>
  );
}

function MonthArrow({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
    >
      {children}
    </button>
  );
}
