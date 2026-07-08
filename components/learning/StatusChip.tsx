"use client";

import type { GoalStatus } from "@/lib/types";
import { cx } from "../ui";

// One tap advances the status. Low friction beats a dropdown here.
const ORDER: GoalStatus[] = ["NOT_STARTED", "IN_PROGRESS", "DONE"];

const META: Record<GoalStatus, { label: string; cls: string }> = {
  NOT_STARTED: {
    label: "Not started",
    cls: "border-border text-text-secondary hover:text-text-primary",
  },
  IN_PROGRESS: {
    label: "In progress",
    cls: "border-accent bg-accent/15 text-accent",
  },
  DONE: { label: "Done", cls: "border-green bg-green/15 text-green" },
};

export function StatusChip({
  status,
  onChange,
}: {
  status: GoalStatus;
  onChange: (next: GoalStatus) => void;
}) {
  const meta = META[status];
  const advance = () =>
    onChange(ORDER[(ORDER.indexOf(status) + 1) % ORDER.length]);

  return (
    <button
      type="button"
      onClick={advance}
      aria-label={`Status: ${meta.label}. Tap to change.`}
      className={cx(
        "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
        meta.cls,
      )}
    >
      {meta.label}
    </button>
  );
}
