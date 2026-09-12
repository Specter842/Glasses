"use client";

import type { RenderedDay, CalendarEvent, RecurringEvent } from "@/lib/types";
import { COURSE_TYPE_SHORT } from "@/lib/types";
import { useData } from "../DataProvider";
import { deleteEvent } from "@/lib/store";
import { DAY_NAMES_SHORT } from "@/lib/time";
import { fromISODate, formatTime, todayISO } from "@/lib/time";
import { cx } from "../ui";
import { DayActions } from "./DayActions";
import { AttendanceMark } from "../attendance/AttendanceMark";

export function DayColumn({
  day,
  isToday,
  compact,
}: {
  day: RenderedDay;
  isToday: boolean;
  compact?: boolean;
}) {
  const d = fromISODate(day.date);
  const dayNum = d.getDate();
  const hasOverride = day.cleared || day.copiedFromDayOfWeek !== null;
  const isPast = day.date <= todayISO();

  return (
    <div
      className={cx(
        "flex flex-col rounded-lg border bg-surface",
        isToday ? "border-accent/50" : "border-border",
        compact ? "min-h-[180px]" : "min-h-[220px]",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span
            className={cx(
              "text-xs font-semibold uppercase tracking-wide",
              isToday ? "text-accent" : "text-text-secondary",
            )}
          >
            {DAY_NAMES_SHORT[day.dayOfWeek]}
          </span>
          <span className="font-mono text-sm text-text-primary">{dayNum}</span>
        </div>
        {isToday && (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Today
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2">
        {day.copiedFromDayOfWeek !== null && (
          <div className="rounded bg-bg px-2 py-1 text-[11px] text-text-secondary">
            Copied from {DAY_NAMES_SHORT[day.copiedFromDayOfWeek]}
          </div>
        )}

        {day.classes.length === 0 &&
          day.events.length === 0 &&
          day.recurringEvents.length === 0 && (
            <div className="flex flex-1 items-center justify-center px-2 py-4 text-center text-xs text-text-secondary">
              {day.cleared ? "Cleared" : "Nothing on"}
            </div>
          )}

        {day.classes.length > 0 &&
          day.classes.map((c, i) => {
            const cancelled = c.status === "CANCELLED";
            const attended = c.status === "ATTENDED";
            const absent = c.status === "ABSENT";
            // instanceId is set once a ClassInstance row exists for this
            // occurrence (attended/absent/cancelled, or materialised as
            // still-scheduled) — null means it's still a virtual render
            // straight off the recurring weekly template, untouched.
            const materialised = c.instanceId !== null;
            return (
              <div
                key={c.instanceId ?? `t-${i}`}
                className={cx(
                  "rounded border-l-2 bg-bg px-2 py-1.5",
                  materialised && "border border-white/70",
                  cancelled && "opacity-45",
                )}
                style={{ borderLeftColor: cancelled ? "#242424" : c.color }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cx(
                      "truncate text-sm font-medium text-text-primary",
                      cancelled && "line-through",
                    )}
                  >
                    {c.courseName}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {(attended || absent) && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: attended ? "#17C964" : "#FF2D55" }}
                        title={attended ? "Attended" : "Absent"}
                      />
                    )}
                    <span className="rounded border border-border px-1 text-[9px] font-semibold uppercase tracking-wide text-text-secondary">
                      {COURSE_TYPE_SHORT[c.courseType]}
                    </span>
                  </div>
                </div>
                <div
                  className={cx(
                    "mt-0.5 font-mono text-[11px] text-text-secondary",
                    cancelled && "line-through",
                  )}
                >
                  {formatTime(c.startTime)}–{formatTime(c.endTime)}
                </div>
                {c.location && (
                  <div className="truncate font-mono text-[11px] text-text-secondary/70">
                    {c.location}
                  </div>
                )}
                {!compact && isPast && !day.cleared && (
                  <div className="mt-2">
                    <AttendanceMark
                      occ={{
                        courseId: c.courseId,
                        date: c.date,
                        startTime: c.startTime,
                        endTime: c.endTime,
                      }}
                      status={c.status}
                    />
                  </div>
                )}
              </div>
            );
          })}

        {day.events.map((e) => (
          <EventRow key={e.id} event={e} compact={compact} />
        ))}

        {day.recurringEvents.map((e) => (
          <RecurringEventRow key={e.id} event={e} compact={compact} />
        ))}
      </div>

      <div className="border-t border-border px-2 py-1.5">
        <DayActions
          date={day.date}
          hasOverride={hasOverride}
          cleared={day.cleared}
          compact={compact}
        />
      </div>
    </div>
  );
}

/**
 * A custom event. Dashed border and an EVENT tag so it never reads as a class —
 * events carry no attendance and no Attended/Absent controls.
 */
function EventRow({
  event,
  compact,
}: {
  event: CalendarEvent;
  compact?: boolean;
}) {
  const { mutate } = useData();
  const timeLabel = event.start_time
    ? event.end_time
      ? `${formatTime(event.start_time)}–${formatTime(event.end_time)}`
      : formatTime(event.start_time)
    : "All day";

  return (
    <div
      className="group rounded border-l-2 border-dashed bg-bg px-2 py-1.5"
      style={{ borderLeftColor: event.color }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-text-primary">
          {event.title}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded border border-border px-1 text-[9px] font-semibold uppercase tracking-wide text-text-secondary">
            Event
          </span>
          <button
            type="button"
            aria-label={`Delete ${event.title}`}
            onClick={() => mutate((d) => deleteEvent(d, event.id))}
            className="rounded px-1 text-text-secondary transition-colors hover:text-red-neon"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-text-secondary">
        {timeLabel}
      </div>
      {event.note && !compact && (
        <div className="truncate text-[11px] text-text-secondary/70">
          {event.note}
        </div>
      )}
    </div>
  );
}

/**
 * A personal weekly-recurring entry — a club meeting, a standing
 * commitment — not a course, so no attendance controls. Managed from Setup
 * (the weekly template), not per-occurrence here, so there's no inline
 * delete — editing the template changes every future week at once.
 */
function RecurringEventRow({
  event,
  compact,
}: {
  event: RecurringEvent;
  compact?: boolean;
}) {
  const timeLabel = event.start_time
    ? event.end_time
      ? `${formatTime(event.start_time)}–${formatTime(event.end_time)}`
      : formatTime(event.start_time)
    : "All day";

  return (
    <div
      className="rounded border-l-2 border-dashed bg-bg px-2 py-1.5"
      style={{ borderLeftColor: event.color }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-text-primary">
          {event.title}
        </span>
        <span className="shrink-0 rounded border border-border px-1 text-[9px] font-semibold uppercase tracking-wide text-text-secondary">
          Recurring
        </span>
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-text-secondary">
        {timeLabel}
      </div>
      {event.note && !compact && (
        <div className="truncate text-[11px] text-text-secondary/70">
          {event.note}
        </div>
      )}
    </div>
  );
}
