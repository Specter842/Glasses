"use client";

import { useRef, useState } from "react";
import { useData } from "../DataProvider";
import { clearTimetable, replaceTimetable, type ImportedClass } from "@/lib/store";
import { extractTimetable } from "@/lib/timetableImport";
import { useApiKey } from "../ai/useApiKey";
import { AiError, NeedsKeyHint } from "../ai/ApiKeyCard";
import { COURSE_TYPE_SHORT } from "@/lib/types";
import { DAY_NAMES, formatTime } from "@/lib/time";
import { btn, cx, Card } from "../ui";

export function TimetableImport({ hasTimetable }: { hasTimetable: boolean }) {
  const { mutate } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const { apiKey, loaded } = useApiKey();

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<ImportedClass[] | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const detect = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setReview(null);
    try {
      const classes = await extractTimetable(file, apiKey);
      if (classes.length === 0) {
        setError("No classes were found in that image.");
      } else {
        setReview(classes);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const applyReplace = () => {
    if (!review) return;
    const classes = review;
    mutate((d) => replaceTimetable(d, classes));
    setReview(null);
    setFile(null);
    setConfirmReplace(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const applyDelete = () => {
    mutate((d) => clearTimetable(d));
    setConfirmDelete(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Upload */}
      <Card className="flex flex-col gap-3 p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setReview(null);
            setError("");
          }}
          className="w-full text-xs text-text-secondary file:mr-3 file:rounded-md file:border file:border-border file:bg-bg file:px-3 file:py-1.5 file:text-xs file:text-text-primary"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={detect}
            disabled={!file || !apiKey || busy}
            className={cx(btn.base, btn.primary, "px-3 py-1.5")}
          >
            {busy ? "Reading timetable…" : "Detect classes"}
          </button>
          {loaded && !apiKey && <NeedsKeyHint what="detect classes from an image" />}
        </div>
        {error && <AiError message={error} />}
      </Card>

      {/* Review before writing anything */}
      {review && <ReviewPanel
        classes={review}
        confirm={confirmReplace}
        onArm={() => setConfirmReplace(true)}
        onApply={applyReplace}
        onCancel={() => {
          setReview(null);
          setConfirmReplace(false);
        }}
      />}

      {/* Delete */}
      {hasTimetable && (
        <Card className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div>
            <div className="text-sm text-text-primary">Delete timetable</div>
            <p className="text-[11px] text-text-secondary">
              Removes all courses, slots and attendance history. Tasks and
              learning goals are kept.
            </p>
          </div>
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyDelete}
                className={cx(
                  btn.base,
                  "border border-red-neon bg-red-neon/15 px-3 py-1.5 text-red-neon hover:bg-red-neon/25",
                )}
              >
                Yes, delete it
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={cx(btn.base, btn.ghost)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={cx(btn.base, btn.outline, "px-3 py-1.5 text-xs")}
            >
              Delete
            </button>
          )}
        </Card>
      )}
    </div>
  );
}

function ReviewPanel({
  classes,
  confirm,
  onArm,
  onApply,
  onCancel,
}: {
  classes: ImportedClass[];
  confirm: boolean;
  onArm: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const courseCount = new Set(
    classes.map((c) => c.courseCode || `${c.courseName}|${c.type}`),
  ).size;

  const days = DAY_NAMES.map((name, dow) => ({
    name,
    dow,
    items: classes
      .filter((c) => c.dayOfWeek === dow)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  })).filter((d) => d.items.length > 0);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          Review detected classes
        </h3>
        <p className="mt-1 font-mono text-xs text-text-secondary">
          {classes.length} classes · {courseCount} courses
        </p>
      </div>

      {/* Per-day counts — the attendance denominator for each day. */}
      <div className="flex flex-wrap gap-1.5">
        {days.map((d) => (
          <span
            key={d.dow}
            className="rounded border border-border px-2 py-0.5 font-mono text-[11px] text-text-secondary"
          >
            {d.name.slice(0, 3)} {d.items.length}
          </span>
        ))}
      </div>

      <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
        {days.map((d) => (
          <div key={d.dow} className="flex flex-col gap-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              {d.name}
            </div>
            {d.items.map((c, i) => (
              <div
                key={`${c.courseCode}-${c.startTime}-${i}`}
                className="flex items-center gap-2 rounded border border-border bg-bg px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                  {c.courseName}
                </span>
                {c.courseCode && (
                  <span className="shrink-0 rounded bg-red-neon/15 px-1.5 py-0.5 font-mono text-[10px] text-red-neon">
                    {c.courseCode}
                  </span>
                )}
                <span className="shrink-0 rounded border border-border px-1 text-[9px] font-semibold uppercase text-text-secondary">
                  {COURSE_TYPE_SHORT[c.type]}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-text-secondary">
                  {formatTime(c.startTime)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-text-secondary">
        Each course code is tracked separately against its own 75% threshold. A
        day&apos;s attendance is counted from the number of classes shown above.
        Replacing wipes existing courses and attendance history.
      </p>

      <div className="flex flex-wrap gap-2">
        {confirm ? (
          <button
            type="button"
            onClick={onApply}
            className={cx(
              btn.base,
              "border border-red-neon bg-red-neon/15 px-3 py-2 text-red-neon hover:bg-red-neon/25",
            )}
          >
            Confirm — replace timetable
          </button>
        ) : (
          <button
            type="button"
            onClick={onArm}
            className={cx(btn.base, btn.primary)}
          >
            Replace timetable
          </button>
        )}
        <button type="button" onClick={onCancel} className={cx(btn.base, btn.ghost)}>
          Cancel
        </button>
      </div>
    </Card>
  );
}
