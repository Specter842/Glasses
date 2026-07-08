"use client";

import { useState } from "react";
import type { Course, CourseType } from "@/lib/types";
import { useData } from "../DataProvider";
import { addCourse, deleteCourse, updateCourseThreshold } from "@/lib/store";
import { btn, cx, Card } from "../ui";

// Only the permitted palette: royal blue / red / green + neon shades, plus white.
const PRESET_COLORS = [
  "#2E5BFF",
  "#5B8CFF",
  "#E11030",
  "#FF2D55",
  "#17C964",
  "#37FF8B",
  "#FFFFFF",
];

export function CourseManager({
  hasSemester,
  courses,
}: {
  hasSemester: boolean;
  courses: Course[];
}) {
  const { mutate } = useData();
  const [name, setName] = useState("");
  const [type, setType] = useState<CourseType>("LECTURE");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [threshold, setThreshold] = useState("75");

  const submit = () => {
    if (!name.trim()) return;
    const payload = {
      name,
      type,
      color,
      thresholdPct: Number(threshold) || 75,
    };
    setName("");
    mutate((d) => addCourse(d, payload));
  };

  if (!hasSemester) {
    return (
      <Card className="px-4 py-3 text-sm text-text-secondary">
        Create a semester first, then add its courses here.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Data Structures"
              className="w-full text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CourseType)}
              className="text-sm"
            >
              <option value="LECTURE">Lecture</option>
              <option value="LAB">Lab</option>
            </select>
          </label>
          <label className="flex w-24 flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              Min %
            </span>
            <input
              type="number"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="font-mono text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              Colour
            </span>
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  onClick={() => setColor(c)}
                  className={cx(
                    "h-6 w-6 rounded-full border-2 transition-transform",
                    color === c ? "border-white" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className={cx(btn.base, btn.primary)}
          >
            Add course
          </button>
        </div>
      </Card>

      {courses.length === 0 ? (
        <p className="px-1 text-sm text-text-secondary">No courses yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {courses.map((c) => (
            <CourseRow key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseRow({ course }: { course: Course }) {
  const { mutate } = useData();
  const [threshold, setThreshold] = useState(
    String(course.attendance_threshold_pct),
  );

  const commit = () => {
    const n = Number(threshold);
    if (Number.isNaN(n) || n === course.attendance_threshold_pct) return;
    mutate((d) => updateCourseThreshold(d, course.id, n));
  };

  return (
    <div className="flex items-center gap-3 bg-surface px-4 py-2.5 first:rounded-t-lg last:rounded-b-lg">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: course.color }}
      />
      <span className="flex-1 text-sm text-text-primary">{course.name}</span>
      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
        {course.type === "LAB" ? "Lab" : "Lecture"}
      </span>
      <label className="flex items-center gap-1.5">
        <span className="text-[11px] text-text-secondary">min</span>
        <input
          type="number"
          min="0"
          max="100"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-16 font-mono text-sm"
        />
        <span className="font-mono text-[11px] text-text-secondary">%</span>
      </label>
      <button
        type="button"
        aria-label="Delete course"
        onClick={() => mutate((d) => deleteCourse(d, course.id))}
        className="rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
      >
        ✕
      </button>
    </div>
  );
}
