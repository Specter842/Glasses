"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { setCurrency } from "@/lib/store";
import { btn, cx, Card } from "../ui";

const COMMON = ["₹", "$", "€", "£", "¥"];

export function CurrencyForm() {
  const { db, mutate } = useData();
  const [draft, setDraft] = useState(db.settings.currency);

  return (
    <Card className="flex flex-col gap-2 p-4">
      <span className="text-xs font-medium text-text-secondary">Currency symbol</span>
      <div className="flex flex-wrap items-center gap-2">
        {COMMON.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setDraft(c);
              mutate((d) => setCurrency(d, c));
            }}
            className={cx(
              "h-8 w-8 rounded-md border font-mono text-sm transition-colors",
              db.settings.currency === c
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-text-secondary hover:text-text-primary",
            )}
          >
            {c}
          </button>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={3}
          aria-label="Custom currency symbol"
          className="w-16 font-mono text-sm"
        />
        <button
          type="button"
          disabled={!draft.trim() || draft === db.settings.currency}
          onClick={() => mutate((d) => setCurrency(d, draft))}
          className={cx(btn.base, btn.primary, "px-3 py-1.5 text-xs")}
        >
          Use
        </button>
      </div>
      <p className="text-[11px] text-text-secondary">
        Display only — amounts are stored as exact integers, never converted.
      </p>
    </Card>
  );
}
