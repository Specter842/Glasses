"use client";

import { useData } from "../DataProvider";
import { markAttendance, type Occurrence } from "@/lib/store";
import type { ClassStatus } from "@/lib/types";
import { cx } from "../ui";

const OPTIONS: {
  key: "ATTENDED" | "ABSENT" | "CANCELLED";
  label: string;
  active: string;
}[] = [
  { key: "ATTENDED", label: "Attended", active: "border-green bg-green/15 text-green" },
  { key: "ABSENT", label: "Absent", active: "border-red-neon bg-red-neon/15 text-red-neon" },
  {
    key: "CANCELLED",
    label: "Cancelled",
    active: "border-text-secondary bg-surface text-text-primary",
  },
];

export function AttendanceMark({
  occ,
  status,
}: {
  occ: Occurrence;
  status: ClassStatus;
}) {
  const { mutate } = useData();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {OPTIONS.map((o) => {
        const isActive = status === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => mutate((d) => markAttendance(d, occ, o.key))}
            className={cx(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? o.active
                : "border-border text-text-secondary hover:border-text-secondary hover:text-text-primary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
