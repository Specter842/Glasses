"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { PALETTE, addEvent } from "@/lib/store";
import { formatDayLabel } from "@/lib/time";
import { btn, cx, Card } from "../ui";

/**
 * Adds a one-off event to the day currently shown. Events sit alongside classes
 * on the calendar and never count toward attendance.
 */
export function EventComposer({ date }: { date: string }) {
  const { mutate } = useData();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  const submit = () => {
    if (!title.trim()) return;
    const payload = { date, title, startTime, endTime, note, color };
    setTitle("");
    setStartTime("");
    setEndTime("");
    setNote("");
    setOpen(false);
    mutate((d) => addEvent(d, payload));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(btn.base, btn.outline, "self-start px-3 py-1.5 text-xs")}
      >
        + Add event on {formatDayLabel(date)}
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-2 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Event title"
        autoFocus
        className="w-full text-sm"
      />
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-text-secondary">Start (optional)</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full font-mono text-sm"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-text-secondary">End (optional)</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full font-mono text-sm"
          />
        </label>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="w-full text-sm"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              onClick={() => setColor(c)}
              className={cx(
                "h-5 w-5 rounded-full border-2 transition-colors",
                color === c ? "border-white" : "border-transparent",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className={cx(btn.base, btn.primary, "px-3 py-1.5")}
          >
            Add event
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cx(btn.base, btn.ghost)}
          >
            Cancel
          </button>
        </div>
      </div>
    </Card>
  );
}
