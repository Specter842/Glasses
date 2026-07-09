"use client";

import { useData } from "../DataProvider";
import { clearSchedule, duplicateDay, resetDay } from "@/lib/store";
import { DAY_NAMES, DAY_NAMES_SHORT } from "@/lib/time";
import { cx } from "../ui";
import { Select } from "../Select";

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
      <Select
        size="sm"
        className="min-w-[5.5rem]"
        ariaLabel="Copy another day onto this date"
        placeholder="Copy…"
        value=""
        onChange={onCopy}
        options={DAY_NAMES.map((name, i) => ({
          value: String(i),
          label: compact ? DAY_NAMES_SHORT[i] : name,
        }))}
      />
    </div>
  );
}
