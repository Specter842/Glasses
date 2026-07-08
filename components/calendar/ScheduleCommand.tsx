"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { clearSchedule, duplicateDay } from "@/lib/store";
import { parseScheduleCommand } from "@/lib/ai/scheduleCommand";
import { useApiKey } from "../ai/useApiKey";
import { AiError, NeedsKeyHint } from "../ai/ApiKeyCard";
import { DAY_NAMES, formatDayLabel } from "@/lib/time";
import { btn, cx, Card } from "../ui";

/**
 * The app's one chat box. It parses text into exactly one of two actions and
 * then runs the same deterministic store function the buttons call. Both are
 * undoable with "Reset" on the day.
 */
export function ScheduleCommand() {
  const { mutate } = useData();
  const { apiKey, loaded } = useApiKey();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const run = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      const action = await parseScheduleCommand(text, apiKey);
      if (action.kind === "CLEAR") {
        mutate((d) => clearSchedule(d, action.date));
        setDone(`Cleared ${formatDayLabel(action.date)}.`);
      } else {
        mutate((d) => duplicateDay(d, action.targetDate, action.sourceDayOfWeek));
        setDone(
          `Copied ${DAY_NAMES[action.sourceDayOfWeek]} onto ${formatDayLabel(action.targetDate)}.`,
        );
      }
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && run()}
          placeholder="clear today · duplicate tuesday onto saturday"
          disabled={!apiKey}
          className="min-w-0 flex-1 text-sm"
        />
        <button
          type="button"
          onClick={run}
          disabled={busy || !text.trim() || !apiKey}
          className={cx(btn.base, btn.primary, "shrink-0 px-3 py-1.5")}
        >
          {busy ? "Working…" : "Run"}
        </button>
      </div>
      {loaded && !apiKey && <NeedsKeyHint what="use schedule commands" />}
      {done && (
        <p className="rounded-md border border-green/40 bg-green/10 px-3 py-2 text-xs text-green">
          {done} Use Reset on the day to undo.
        </p>
      )}
      {error && <AiError message={error} />}
    </Card>
  );
}
