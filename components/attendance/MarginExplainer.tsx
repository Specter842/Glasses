"use client";

import { useState } from "react";
import type { CourseAttendance } from "@/lib/attendance";
import { explainMargins } from "@/lib/ai/insights";
import { useApiKey } from "../ai/useApiKey";
import { AiError, AiOutput, NeedsKeyHint } from "../ai/ApiKeyCard";
import { btn, cx, Card } from "../ui";

/**
 * Phase 4, feature 3. The numbers are already computed by lib/attendance.ts —
 * the model only puts them into words. It never recomputes them.
 */
export function MarginExplainer({ stats }: { stats: CourseAttendance[] }) {
  const { apiKey, loaded } = useApiKey();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    setText("");
    try {
      setText(await explainMargins(stats, apiKey));
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
        {busy ? "Thinking…" : "How many can I still miss?"}
      </button>
      {loaded && !apiKey && <NeedsKeyHint what="explain your margins" />}
      {text && <AiOutput text={text} />}
      {error && <AiError message={error} />}
    </Card>
  );
}
