"use client";

import { useState } from "react";
import type { Semester } from "@/lib/types";
import { useData } from "../DataProvider";
import { saveSemester } from "@/lib/store";
import { btn, cx, Card } from "../ui";
import { todayISO } from "@/lib/time";

export function SemesterForm({ semester }: { semester: Semester | null }) {
  const { mutate } = useData();
  const [name, setName] = useState(semester?.name ?? "");
  const [startDate, setStartDate] = useState(semester?.start_date ?? todayISO());
  const [endDate, setEndDate] = useState(semester?.end_date ?? "");
  const [saved, setSaved] = useState(false);

  const submit = () => {
    if (!name.trim() || !startDate || !endDate) return;
    mutate((d) => saveSemester(d, { name, startDate, endDate }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Semester 5 — Autumn 2026"
            className="w-full text-sm"
          />
        </Field>
        <Field label="Start date">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full font-mono text-sm"
          />
        </Field>
        <Field label="End date">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full font-mono text-sm"
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim() || !startDate || !endDate}
          className={cx(btn.base, btn.primary)}
        >
          {semester ? "Save semester" : "Create semester"}
        </button>
        {saved && <span className="font-mono text-xs text-green">Saved</span>}
      </div>
    </Card>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
