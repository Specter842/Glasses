"use client";

import { useState } from "react";
import type { Course, TimetableSlot } from "@/lib/types";
import { useData } from "../DataProvider";
import { addSlot, deleteSlot } from "@/lib/store";
import { DAY_NAMES } from "@/lib/time";
import { formatTime } from "@/lib/time";
import { btn, cx, Card } from "../ui";
import { Select } from "../Select";

export function SlotManager({
  courses,
  slots,
}: {
  courses: Course[];
  slots: TimetableSlot[];
}) {
  const { mutate } = useData();
  const [courseId, setCourseId] = useState<number | "">(courses[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const submit = () => {
    if (courseId === "" || !startTime || !endTime) return;
    const payload = {
      courseId: Number(courseId),
      dayOfWeek,
      startTime,
      endTime,
      location: location || null,
    };
    setLocation("");
    mutate((d) => addSlot(d, payload));
  };

  if (courses.length === 0) {
    return (
      <Card className="px-4 py-3 text-sm text-text-secondary">
        Add at least one course before building the timetable.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              Course
            </span>
            <Select
              ariaLabel="Course"
              value={String(courseId)}
              onChange={(v) => setCourseId(Number(v))}
              options={courses.map((c) => ({
                value: String(c.id),
                label: c.name,
                color: c.color,
              }))}
            />
          </div>
          <div className="flex min-w-[8rem] flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Day</span>
            <Select
              ariaLabel="Day of week"
              value={String(dayOfWeek)}
              onChange={(v) => setDayOfWeek(Number(v))}
              options={DAY_NAMES.map((d, i) => ({ value: String(i), label: d }))}
            />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Start</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="font-mono text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">End</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="font-mono text-sm"
            />
          </label>
          <label className="flex min-w-[120px] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              Location
            </span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="optional"
              className="w-full text-sm"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={courseId === ""}
            className={cx(btn.base, btn.primary)}
          >
            Add slot
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DAY_NAMES.map((dayName, dow) => {
          const daySlots = slots
            .filter((s) => s.day_of_week === dow)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          if (daySlots.length === 0) return null;
          return (
            <Card key={dow} className="p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {dayName}
              </div>
              <div className="flex flex-col gap-1.5">
                {daySlots.map((slot) => {
                  const course = courseMap.get(slot.course_id);
                  return (
                    <SlotRow
                      key={slot.id}
                      slot={slot}
                      courseName={course?.name ?? "Unknown"}
                      color={course?.color ?? "#9A9A9A"}
                    />
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  courseName,
  color,
}: {
  slot: TimetableSlot;
  courseName: string;
  color: string;
}) {
  const { mutate } = useData();
  return (
    <div
      className="flex items-center gap-2 rounded border-l-2 bg-bg px-2 py-1.5"
      style={{ borderLeftColor: color }}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text-primary">{courseName}</div>
        <div className="font-mono text-[11px] text-text-secondary">
          {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
          {slot.location ? ` · ${slot.location}` : ""}
        </div>
      </div>
      <button
        type="button"
        aria-label="Delete slot"
        onClick={() => mutate((d) => deleteSlot(d, slot.id))}
        className="rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
      >
        ✕
      </button>
    </div>
  );
}
