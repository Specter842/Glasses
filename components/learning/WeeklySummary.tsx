"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { getGoals, getResourcesForGoal } from "@/lib/store";
import { weeklyLearningSummary } from "@/lib/ai/insights";
import { useApiKey } from "../ai/useApiKey";
import { AiError, AiOutput, NeedsKeyHint } from "../ai/ApiKeyCard";
import { btn, cx, Card } from "../ui";

/** Phase 4, feature 4: one command, a plain-language progress summary. */
export function WeeklySummary() {
  const { db } = useData();
  const { apiKey, loaded } = useApiKey();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    setText("");
    try {
      const summary = await weeklyLearningSummary(
        getGoals(db),
        (goalId) => getResourcesForGoal(db, goalId),
        apiKey,
      );
      setText(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-2 p-3">
      <button
        type="button"
        onClick={run}
        disabled={busy || !apiKey}
        className={cx(btn.base, btn.primary, "self-start px-3 py-1.5")}
      >
        {busy ? "Thinking…" : "Weekly summary"}
      </button>
      {loaded && !apiKey && <NeedsKeyHint what="generate a weekly summary" />}
      {text && <AiOutput text={text} />}
      {error && <AiError message={error} />}
    </Card>
  );
}
