"use client";

import { useData } from "../DataProvider";
import { clearSchedule, duplicateDay, resetDay } from "@/lib/store";
import { DAY_NAMES, DAY_NAMES_SHORT } from "@/lib/time";
import { cx } from "../ui";

export function DayActions({
  date,
  hasOverride,
  cleared,
  compact,
}: {
  date: string;
  hasOverride: boolean;
  cleared: boolean;
  compact?: boolean;
}) {
  const { mutate } = useData();

  const onCopy = (value: string) => {
    if (value === "") return;
    const dow = Number(value);
    mutate((d) => duplicateDay(d, date, dow));
  };

  const actionCls = cx(
    "rounded px-1.5 py-0.5 text-[11px] uppercase tracking-wide transition-colors",
    "text-text-secondary hover:bg-bg hover:text-text-primary",
  );

  return (
    <div className={cx("flex flex-wrap items-center gap-1", compact && "gap-0.5")}>
      {!cleared && (
        <button
          type="button"
          className={actionCls}
          onClick={() => mutate((d) => clearSchedule(d, date))}
        >
          Clear
        </button>
      )}
      {hasOverride && (
        <button
          type="button"
          className={actionCls}
          onClick={() => mutate((d) => resetDay(d, date))}
        >
          Reset
        </button>
      )}
      <select
        aria-label="Copy another day onto this date"
        value=""
        onChange={(e) => onCopy(e.target.value)}
        className="rounded border border-border bg-bg px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-text-secondary"
      >
        <option value="">Copy…</option>
        {DAY_NAMES.map((name, i) => (
          <option key={i} value={i}>
            {compact ? DAY_NAMES_SHORT[i] : name}
          </option>
        ))}
      </select>
    </div>
  );
}
