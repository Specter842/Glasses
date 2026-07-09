"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

// App-rendered dropdown. A native <select> opens an OS-drawn, device-styled,
// opaque picker that ignores our theme; this renders the options ourselves so
// the whole control matches the app on every device. Values are strings —
// convert at the call site.

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export function Select({
  value,
  options,
  onChange,
  placeholder = "Select…",
  ariaLabel,
  className,
  size = "md",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0); // keyboard highlight
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const commit = (i: number) => {
    const opt = options[i];
    if (opt) onChange(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cx(
          "flex w-full items-center justify-between gap-1.5 rounded-md border border-border bg-bg text-left outline-none focus:border-accent",
          size === "sm"
            ? "px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-text-secondary"
            : "px-3 py-2 text-sm",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
          )}
          <span
            className={cx(
              "truncate",
              selected ? "text-text-primary" : "text-text-secondary",
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={cx(
            "h-4 w-4 shrink-0 text-text-secondary transition-transform",
            open && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg shadow-black/60"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  // onMouseDown so the choice registers before the button blur.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(i);
                  }}
                  className={cx(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    i === active && "bg-bg",
                    isSelected ? "text-accent" : "text-text-primary",
                  )}
                >
                  {o.color && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: o.color }}
                    />
                  )}
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <svg
                      viewBox="0 0 24 24"
                      className="ml-auto h-3.5 w-3.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
