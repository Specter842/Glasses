"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { clearSchedule } from "@/lib/store";
import { runOcr, type OcrProgress } from "@/lib/ocr";
import { parseHolidays, type ParsedHolidayRow } from "@/lib/holidayParse";
import { formatDayLabel } from "@/lib/time";
import { btn, cx, Card } from "../ui";

interface EditableRow extends ParsedHolidayRow {
  id: string;
}

let rowSeq = 0;
function toEditable(row: ParsedHolidayRow): EditableRow {
  return { ...row, id: `h${rowSeq++}` };
}

type Status = "idle" | "processing" | "review" | "done";

export function ImportHolidays() {
  const { mutate } = useData();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const onFile = async (file: File) => {
    setError(null);
    setStatus("processing");
    setProgress(null);
    try {
      const lines = await runOcr(file, setProgress);
      const parsed = parseHolidays(lines);
      setRows(parsed.map(toEditable));
      setStatus("review");
    } catch (e) {
      console.error("Holiday OCR failed", e);
      setError("Couldn't read that file. Try a clearer image or a different page.");
      setStatus("idle");
    }
  };

  const updateRow = (id: string, patch: Partial<EditableRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const addBlankRow = () =>
    setRows((rs) => [...rs, toEditable({ date: "", label: "", sourceText: "" })]);

  const confirm = () => {
    const valid = rows.filter((r) => r.date);
    mutate((d) => {
      for (const row of valid) clearSchedule(d, row.date);
    });
    setCount(valid.length);
    setStatus("done");
    setRows([]);
  };

  const reset = () => {
    setStatus("idle");
    setProgress(null);
    setRows([]);
    setError(null);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(btn.base, btn.outline, "self-start px-3 py-1.5 text-xs")}
      >
        Import holidays (image/PDF)
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Import holidays
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className={cx(btn.base, btn.ghost, "text-xs")}
        >
          Close
        </button>
      </div>

      <p className="text-xs text-text-secondary">
        Upload an academic calendar and each date found gets marked cleared
        — no classes, excluded from attendance — same as manually clearing a
        day. OCR runs on-device; review before confirming.
      </p>

      {status === "idle" && (
        <>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
            className="text-xs text-text-secondary file:mr-2 file:rounded-md file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-xs file:text-text-primary"
          />
          {error && <p className="text-xs text-red-neon">{error}</p>}
        </>
      )}

      {status === "processing" && (
        <p className="font-mono text-xs text-text-secondary">
          {progress
            ? `Page ${progress.page}/${progress.totalPages} — ${progress.status} (${Math.round(progress.progress * 100)}%)`
            : "Starting…"}
        </p>
      )}

      {status === "review" && (
        <>
          {rows.length === 0 && (
            <p className="text-sm text-text-secondary">
              Couldn't find any dates. Add rows manually below, or try a
              different file.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-1.5">
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(row.id, { date: e.target.value })}
                  className="w-[9.5rem] font-mono text-xs"
                  aria-label="Date"
                />
                <input
                  value={row.label}
                  onChange={(e) => updateRow(row.id, { label: e.target.value })}
                  placeholder="Label (not stored, for your reference)"
                  className="min-w-[8rem] flex-1 text-xs"
                />
                {row.date && (
                  <span className="shrink-0 font-mono text-[10px] text-text-secondary">
                    {formatDayLabel(row.date)}
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Remove row"
                  onClick={() => removeRow(row.id)}
                  className="shrink-0 rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <button type="button" onClick={addBlankRow} className={cx(btn.base, btn.ghost, "text-xs")}>
              + Add row
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={reset} className={cx(btn.base, btn.ghost, "text-xs")}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={rows.every((r) => !r.date)}
                className={cx(btn.base, btn.primary, "px-3 py-1.5 text-xs")}
              >
                Confirm import
              </button>
            </div>
          </div>
        </>
      )}

      {status === "done" && (
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs text-text-secondary">
            Cleared {count} day{count === 1 ? "" : "s"}
          </p>
          <button type="button" onClick={reset} className={cx(btn.base, btn.ghost, "text-xs")}>
            Import another
          </button>
        </div>
      )}
    </Card>
  );
}
