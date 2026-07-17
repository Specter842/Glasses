"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { getTasksSorted } from "@/lib/store";
import { cx, SectionTitle } from "../ui";
import { TaskPanel } from "../tasks/TaskPanel";
import { HabitsPanel } from "./HabitsPanel";
import { NotesPanel } from "./NotesPanel";

type Section = "habits" | "todo" | "notes";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "habits", label: "Habits" },
  { id: "todo", label: "To-do" },
  { id: "notes", label: "Notes" },
];

export function TrackerScreen() {
  const { db, ready } = useData();
  const [section, setSection] = useState<Section>("habits");

  if (!ready) {
    return (
      <p className="py-16 text-center text-sm text-text-secondary">Loading…</p>
    );
  }

  const tasks = getTasksSorted(db);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Tracker</SectionTitle>

      {/* Segmented switch between habits, to-do and notes. */}
      <div className="flex rounded-md border border-border p-0.5">
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-pressed={active}
              className={cx(
                "flex-1 rounded px-3 py-1.5 text-center text-sm transition-colors",
                active
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {section === "habits" && <HabitsPanel />}
      {section === "todo" && <TaskPanel tasks={tasks} />}
      {section === "notes" && <NotesPanel />}
    </div>
  );
}
