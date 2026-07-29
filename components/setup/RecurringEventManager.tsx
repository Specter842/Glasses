"use client";

import { useState } from "react";
import type { RecurringEvent } from "@/lib/types";
import { useData } from "../DataProvider";
import { PALETTE, addRecurringEvent, deleteRecurringEvent } from "@/lib/store";
import { DAY_NAMES, formatTime } from "@/lib/time";
import { btn, cx, Card } from "../ui";
import { Select } from "../Select";

// A personal weekly-recurring entry that isn't a course — a club meeting, a
// standing commitment. Same shape as the timetable's SlotManager, but with
// no course/attendance semantics: just title, day, optional time, colour.

export function RecurringEventManager({ events }: { events: RecurringEvent[] }) {
  const { mutate } = useData();
  const [title, setTitle] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  const submit = () => {
    if (!title.trim()) return;
    const payload = {
      title,
      dayOfWeek,
      startTime: startTime || null,
      endTime: endTime || null,
      note: note || null,
      color,
    };
    setTitle("");
    setNote("");
    mutate((d) => addRecurringEvent(d, payload));
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Robotics Club"
              className="w-full text-sm"
            />
          </label>
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
            <span className="text-xs font-medium text-text-secondary">
              Start (optional)
            </span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="font-mono text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              End (optional)
            </span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="font-mono text-sm"
            />
          </label>
          <label className="flex min-w-[120px] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              Note
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="optional"
              className="w-full text-sm"
            />
          </label>
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                onClick={() => setColor(c)}
                className={cx(
                  "h-6 w-6 rounded-full border-2 transition-colors",
                  color === c ? "border-white" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className={cx(btn.base, btn.primary)}
          >
            Add
          </button>
        </div>
      </Card>

      {events.length === 0 ? (
        <p className="px-1 text-sm text-text-secondary">
          No recurring events yet. Add a club, a standing commitment —
          anything that repeats weekly but isn't a course.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DAY_NAMES.map((dayName, dow) => {
            const dayEvents = events
              .filter((e) => e.day_of_week === dow)
              .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
            if (dayEvents.length === 0) return null;
            return (
              <Card key={dow} className="p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  {dayName}
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayEvents.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: RecurringEvent }) {
  const { mutate } = useData();
  const timeLabel = event.start_time
    ? event.end_time
      ? `${formatTime(event.start_time)}–${formatTime(event.end_time)}`
      : formatTime(event.start_time)
    : "All day";
  return (
    <div
      className="flex items-center gap-2 rounded border-l-2 bg-bg px-2 py-1.5"
      style={{ borderLeftColor: event.color }}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text-primary">{event.title}</div>
        <div className="font-mono text-[11px] text-text-secondary">
          {timeLabel}
          {event.note ? ` · ${event.note}` : ""}
        </div>
      </div>
      <button
        type="button"
        aria-label={`Delete ${event.title}`}
        onClick={() => mutate((d) => deleteRecurringEvent(d, event.id))}
        className="rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
      >
        ✕
      </button>
    </div>
  );
}
