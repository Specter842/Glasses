"use client";

import { useData } from "../DataProvider";
import { COURSE_TYPE_SHORT } from "@/lib/types";
import { getCourses } from "@/lib/store";
import { pendingAttendance } from "@/lib/schedule";
import { computeCourseAttendance, type CourseAttendance } from "@/lib/attendance";
import { todayISO, formatDayLabel, formatTime } from "@/lib/time";
import { Gauge } from "./Gauge";
import { AttendanceMark } from "./AttendanceMark";
import { SectionTitle, Card, cx } from "../ui";
import Link from "next/link";

export function AttendanceScreen() {
  const { db, ready } = useData();

  if (!ready) {
    return (
      <p className="py-16 text-center text-sm text-text-secondary">Loading…</p>
    );
  }

  const today = todayISO();
  const courses = getCourses(db);

  if (!db.semester || courses.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
        No courses yet.{" "}
        <Link href="/setup" className="text-accent hover:underline">
          Open Setup
        </Link>{" "}
        to add your timetable, then attendance shows up here.
      </div>
    );
  }

  const pending = pendingAttendance(db, db.semester.start_date, today).sort(
    (a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : a.startTime.localeCompare(b.startTime),
  );

  const stats = courses.map((c) => computeCourseAttendance(c, db.instances));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <SectionTitle>Attendance</SectionTitle>
        <span className="font-mono text-xs text-text-secondary">
          {db.semester.name}
        </span>
      </div>

      {/* Marking queue */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">Needs marking</h3>
          <span className="font-mono text-xs text-text-secondary">
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <Card className="px-4 py-3 text-sm text-text-secondary">
            All caught up — nothing to mark.
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((c) => (
              <Card
                key={`${c.courseId}-${c.date}-${c.startTime}`}
                className="flex flex-col gap-2 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="truncate text-sm font-medium text-text-primary"
                    style={{ borderLeft: `2px solid ${c.color}`, paddingLeft: 8 }}
                  >
                    {c.courseName}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-text-secondary">
                    {formatDayLabel(c.date)} · {formatTime(c.startTime)}
                  </span>
                </div>
                <AttendanceMark
                  occ={{
                    courseId: c.courseId,
                    date: c.date,
                    startTime: c.startTime,
                    endTime: c.endTime,
                  }}
                  status="SCHEDULED"
                />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Per-course gauges */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-text-primary">By course</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stats.map((s) => (
            <CourseGaugeCard key={s.course.id} stat={s} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CourseGaugeCard({ stat }: { stat: CourseAttendance }) {
  const tone: "safe" | "danger" | "none" = stat.noData
    ? "none"
    : stat.meets
      ? "safe"
      : "danger";

  let bigValue = "—";
  let label = "no data";
  if (stat.noData) {
    bigValue = "—";
    label = "no classes yet";
  } else if (stat.meets) {
    bigValue = stat.unlimited ? "∞" : String(stat.maxMoreSkippable);
    label = "can miss";
  } else if (stat.recoverImpossible) {
    bigValue = "—";
    label = `can't reach ${stat.threshold}%`;
  } else {
    bigValue = String(stat.recoverCount ?? 0);
    label = "attend in a row";
  }

  return (
    <Card className="flex flex-col items-center gap-2 p-4">
      <div className="flex w-full items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: stat.course.color }}
        />
        <span className="truncate text-sm font-medium text-text-primary">
          {stat.course.name}
        </span>
        <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          {COURSE_TYPE_SHORT[stat.course.type]}
        </span>
      </div>

      <Gauge
        pct={stat.pct}
        threshold={stat.threshold}
        tone={tone}
        bigValue={bigValue}
        label={label}
      />

      <div className="flex w-full items-center justify-between font-mono text-xs">
        <span
          className={cx(
            stat.noData
              ? "text-text-secondary"
              : stat.meets
                ? "text-green"
                : "text-red-neon",
          )}
        >
          {stat.pct === null ? "—" : `${stat.pct.toFixed(0)}%`}
        </span>
        <span className="text-text-secondary">
          {stat.attended}/{stat.held} attended
        </span>
        <span className="text-text-secondary">min {stat.threshold}%</span>
      </div>

      <p className="w-full text-center text-xs text-text-secondary">
        {marginSentence(stat)}
      </p>
    </Card>
  );
}

function marginSentence(s: CourseAttendance): string {
  if (s.noData) return "No classes marked yet.";
  if (s.meets) {
    if (s.unlimited) return "No attendance requirement.";
    if (s.maxMoreSkippable === 0)
      return `On the line — miss one more and you drop below ${s.threshold}%.`;
    return `You can miss ${s.maxMoreSkippable} more and stay ≥ ${s.threshold}%.`;
  }
  if (s.recoverImpossible)
    return `Can't get back to ${s.threshold}% this term.`;
  const n = s.recoverCount ?? 0;
  return `Attend the next ${n} in a row to clear ${s.threshold}%.`;
}
