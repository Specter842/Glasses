"use client";

import { useState } from "react";
import { maskKey } from "@/lib/apiKey";
import { GEMINI_MODEL } from "@/lib/ai/gemini";
import { useApiKey } from "./useApiKey";
import { btn, cx, Card } from "../ui";

/** Single place the key is entered. Every AI feature reads it from storage. */
export function ApiKeyCard() {
  const { apiKey, loaded, save } = useApiKey();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const commit = async () => {
    await save(draft);
    setDraft("");
    setEditing(false);
  };

  const showForm = !apiKey || editing;

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-text-secondary">
          Gemini API key
        </span>
        {loaded && apiKey && !editing && (
          <span className="font-mono text-[11px] text-green">
            {maskKey(apiKey)}
          </span>
        )}
      </div>

      {showForm ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza…"
            className="min-w-0 flex-1 font-mono text-sm"
          />
          <button
            type="button"
            onClick={commit}
            disabled={!draft.trim()}
            className={cx(btn.base, btn.primary, "shrink-0 px-3 py-1.5")}
          >
            Save key
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft("");
              }}
              className={cx(btn.base, btn.ghost, "shrink-0")}
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cx(btn.base, btn.outline, "self-start px-3 py-1.5 text-xs")}
        >
          Change key
        </button>
      )}

      <p className="text-[11px] leading-relaxed text-text-secondary">
        Stored on this device only, never sent anywhere but Google. Powers the
        timetable import, schedule commands, and the two summaries — everything
        else works offline without it. Model:{" "}
        <span className="font-mono">{GEMINI_MODEL}</span> (free tier).
      </p>
    </Card>
  );
}

/** Shown by an AI feature when no key is stored yet. */
export function NeedsKeyHint({ what }: { what: string }) {
  return (
    <p className="text-[11px] text-text-secondary">
      Add a Gemini API key in Setup to {what}.
    </p>
  );
}

/** Shared output block for the prose features. */
export function AiOutput({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm leading-relaxed text-text-primary">
      {text}
    </div>
  );
}

/** Shared error block. */
export function AiError({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-red-neon/40 bg-red-neon/10 px-3 py-2 text-xs text-red-neon">
      {message}
    </p>
  );
}
