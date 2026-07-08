"use client";

import { formatLongDate, weekDates, fromISODate } from "@/lib/time";
import { cx } from "../ui";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function rangeLabel(anchor: string, view: "week" | "day"): string {
  if (view === "day") return formatLongDate(anchor);
  const days = weekDates(anchor);
  const first = fromISODate(days[0]);
  const last = fromISODate(days[6]);
  const firstStr = `${first.getDate()} ${MONTHS_SHORT[first.getMonth()]}`;
  const lastStr = `${last.getDate()} ${MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`;
  return `${firstStr} – ${lastStr}`;
}

export function CalendarNav({
  anchor,
  view,
  onPrev,
  onNext,
  onToday,
  onSetView,
}: {
  anchor: string;
  view: "week" | "day";
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSetView: (v: "week" | "day") => void;
}) {
  const arrowCls =
    "flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrev} className={arrowCls} aria-label="Previous">
          ‹
        </button>
        <button type="button" onClick={onNext} className={arrowCls} aria-label="Next">
          ›
        </button>
        <button
          type="button"
          onClick={onToday}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
        >
          Today
        </button>
        <span className="ml-1 font-mono text-sm text-text-primary">
          {rangeLabel(anchor, view)}
        </span>
      </div>

      <div className="flex items-center rounded-md border border-border p-0.5">
        {(["week", "day"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSetView(v)}
            className={cx(
              "rounded px-3 py-1 text-sm capitalize transition-colors",
              v === view
                ? "bg-surface text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
