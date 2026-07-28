"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { addCourse, addSlot, getCourses } from "@/lib/store";
import { runOcr, type OcrProgress } from "@/lib/ocr";
import { parseTimetable, type ParsedSlotRow } from "@/lib/timetableParse";
import { DAY_NAMES } from "@/lib/time";
import { btn, cx, Card } from "../ui";
import { Select } from "../Select";

const NEW_COURSE_COLORS = ["#2E5BFF", "#5B8CFF", "#E11030", "#FF2D55", "#17C964", "#37FF8B"];

interface EditableRow extends ParsedSlotRow {
  id: string;
  location: string;
}

let rowSeq = 0;
function toEditable(row: ParsedSlotRow): EditableRow {
  return { ...row, id: `r${rowSeq++}`, location: "" };
}

type Status = "idle" | "processing" | "review" | "done";

export function ImportTimetable({ hasSemester }: { hasSemester: boolean }) {
  const { db, mutate } = useData();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ slots: number; newCourses: number; skipped: number } | null>(null);

  const courses = getCourses(db);

  const onFile = async (file: File) => {
    setError(null);
    setStatus("processing");
    setProgress(null);
    try {
      const lines = await runOcr(file, setProgress);
      const parsed = parseTimetable(lines);
      setRows(parsed.map(toEditable));
      setStatus("review");
    } catch (e) {
      console.error("Timetable OCR failed", e);
      setError("Couldn't read that file. Try a clearer image or a different page.");
      setStatus("idle");
    }
  };

  const updateRow = (id: string, patch: Partial<EditableRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const addBlankRow = () =>
    setRows((rs) => [
      ...rs,
      toEditable({ dayOfWeek: 1, startTime: "09:00", endTime: "10:00", title: "", sourceText: "" }),
    ]);

  const confirm = () => {
    let slots = 0;
    let newCourses = 0;
    let skipped = 0;
    mutate((d) => {
      for (const row of rows) {
        const title = row.title.trim();
        if (row.dayOfWeek === null || !row.startTime || !row.endTime || !title) {
          skipped++;
          continue;
        }
        let course = d.courses.find(
          (c) => c.name.toLowerCase() === title.toLowerCase(),
        );
        if (!course) {
          addCourse(d, {
            name: title,
            type: "LECTURE",
            color: NEW_COURSE_COLORS[d.courses.length % NEW_COURSE_COLORS.length],
            thresholdPct: 75,
          });
          course = d.courses[d.courses.length - 1];
          newCourses++;
        }
        addSlot(d, {
          courseId: course.id,
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          location: row.location || null,
        });
        slots++;
      }
    });
    setSummary({ slots, newCourses, skipped });
    setStatus("done");
    setRows([]);
  };

  const reset = () => {
    setStatus("idle");
    setProgress(null);
    setRows([]);
    setError(null);
    setSummary(null);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(btn.base, btn.outline, "self-start px-3 py-1.5 text-xs")}
      >
        Import timetable (image/PDF)
      </button>
    );
  }

  if (!hasSemester) {
    return (
      <Card className="flex items-start justify-between gap-3 p-3">
        <p className="text-sm text-text-secondary">
          Create a semester first, then import a timetable here.
        </p>
        <button type="button" onClick={() => setOpen(false)} className={cx(btn.base, btn.ghost, "shrink-0 text-xs")}>
          Close
        </button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Import timetable
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
        OCR runs entirely on-device — nothing leaves your phone. It reads
        best from a clean typed/exported timetable; photos of handwritten or
        grid-style timetables will likely need corrections below. Nothing is
        added until you review and confirm.
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
          {rows.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Couldn't find any day/time patterns. Add rows manually below, or
              try a different file.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-1.5 rounded-md border border-border p-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Select
                    size="sm"
                    className="min-w-[6rem]"
                    ariaLabel="Day"
                    value={row.dayOfWeek === null ? "" : String(row.dayOfWeek)}
                    onChange={(v) => updateRow(row.id, { dayOfWeek: Number(v) })}
                    placeholder="Day?"
                    options={DAY_NAMES.map((d, i) => ({ value: String(i), label: d }))}
                  />
                  <input
                    type="time"
                    value={row.startTime ?? ""}
                    onChange={(e) => updateRow(row.id, { startTime: e.target.value })}
                    className="w-[6.5rem] font-mono text-xs"
                    aria-label="Start time"
                  />
                  <input
                    type="time"
                    value={row.endTime ?? ""}
                    onChange={(e) => updateRow(row.id, { endTime: e.target.value })}
                    className="w-[6.5rem] font-mono text-xs"
                    aria-label="End time"
                  />
                  <button
                    type="button"
                    aria-label="Remove row"
                    onClick={() => removeRow(row.id)}
                    className="ml-auto shrink-0 rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    value={row.title}
                    onChange={(e) => updateRow(row.id, { title: e.target.value })}
                    placeholder="Course name"
                    list="existing-course-names"
                    className="min-w-[8rem] flex-1 text-xs"
                  />
                  <input
                    value={row.location}
                    onChange={(e) => updateRow(row.id, { location: e.target.value })}
                    placeholder="Room (optional)"
                    className="w-28 text-xs"
                  />
                </div>
                {row.sourceText && (
                  <p className="truncate text-[10px] text-text-secondary/70">
                    OCR read: “{row.sourceText}”
                  </p>
                )}
              </div>
            ))}
          </div>
          <datalist id="existing-course-names">
            {courses.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>

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
                disabled={rows.length === 0}
                className={cx(btn.base, btn.primary, "px-3 py-1.5 text-xs")}
              >
                Confirm import
              </button>
            </div>
          </div>
        </>
      )}

      {status === "done" && summary && (
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs text-text-secondary">
            Added {summary.slots} slot{summary.slots === 1 ? "" : "s"}
            {summary.newCourses > 0 ? ` · ${summary.newCourses} new course${summary.newCourses === 1 ? "" : "s"}` : ""}
            {summary.skipped > 0 ? ` · skipped ${summary.skipped}` : ""}
          </p>
          <button type="button" onClick={reset} className={cx(btn.base, btn.ghost, "text-xs")}>
            Import another
          </button>
        </div>
      )}
    </Card>
  );
}
