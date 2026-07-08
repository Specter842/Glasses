"use client";

import { useState } from "react";
import { cx } from "../ui";

/**
 * A plain text input that offers back the things you've already bought in this
 * category. Suggestions are computed deterministically from your own history
 * (see lib/money.ts) — no model, no network, no data leaving the device.
 */
export function ItemSuggest({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (next: string) => void;
  suggestions: string[];
}) {
  const [focused, setFocused] = useState(false);
  // Don't offer back what's already typed in full.
  const visible = suggestions.filter(
    (s) => s.toLowerCase() !== value.trim().toLowerCase(),
  );
  const open = focused && visible.length > 0;

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        // Delay so a click on a suggestion lands before the list unmounts.
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder="What did you buy?"
        aria-autocomplete="list"
        className="w-full text-sm"
      />
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
        >
          {visible.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                // onMouseDown fires before the input's blur.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s);
                  setFocused(false);
                }}
                className={cx(
                  "block w-full px-3 py-2 text-left text-sm text-text-primary",
                  "hover:bg-bg",
                )}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
