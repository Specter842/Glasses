"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { applyOddSem2026Timetable } from "@/lib/store";
import { btn, cx, Card } from "../ui";

// One-off bootstrap button for the user's real Odd Sem 2026-27 timetable +
// academic calendar (hand-transcribed, see applyOddSem2026Timetable in
// lib/store.ts). Additive/idempotent — safe to tap more than once, never
// touches tasks/money/attendance. Delete this component (and its call site
// in SetupScreen) once the real timetable is confirmed loaded.

export function LoadOddSem2026() {
  const { mutate } = useData();
  const [done, setDone] = useState(false);

  return (
    <Card className="flex items-center justify-between gap-3 p-3">
      <p className="text-xs text-text-secondary">
        Loads your real Odd Sem 2026-27 timetable (16 courses) and academic
        calendar (holidays cleared, lieu Saturdays following Monday) in one
        tap. Safe to tap again — it won't create duplicates.
      </p>
      <button
        type="button"
        onClick={() => {
          mutate((d) => applyOddSem2026Timetable(d));
          setDone(true);
        }}
        className={cx(btn.base, btn.primary, "shrink-0 px-3 py-1.5 text-xs")}
      >
        {done ? "Loaded ✓ — tap to reapply" : "Load Odd Sem 2026-27"}
      </button>
    </Card>
  );
}
