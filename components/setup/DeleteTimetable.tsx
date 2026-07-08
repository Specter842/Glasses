"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { clearTimetable } from "@/lib/store";
import { btn, cx, Card } from "../ui";

/** Two-step, because it takes attendance history with it. */
export function DeleteTimetable() {
  const { mutate } = useData();
  const [confirm, setConfirm] = useState(false);

  return (
    <Card className="flex flex-wrap items-center justify-between gap-2 p-4">
      <div>
        <div className="text-sm text-text-primary">Delete timetable</div>
        <p className="text-[11px] text-text-secondary">
          Removes all courses, slots and attendance history. Tasks and learning
          goals are kept.
        </p>
      </div>
      {confirm ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              mutate((d) => clearTimetable(d));
              setConfirm(false);
            }}
            className={cx(
              btn.base,
              "border border-red-neon bg-red-neon/15 px-3 py-1.5 text-red-neon hover:bg-red-neon/25",
            )}
          >
            Yes, delete it
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className={cx(btn.base, btn.ghost)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className={cx(btn.base, btn.outline, "px-3 py-1.5 text-xs")}
        >
          Delete
        </button>
      )}
    </Card>
  );
}
