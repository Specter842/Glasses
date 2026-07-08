"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { useData } from "../DataProvider";
import { addTask } from "@/lib/store";
import { btn, cx, SectionTitle } from "../ui";
import { TaskItem } from "./TaskItem";

export function TaskPanel({ tasks }: { tasks: Task[] }) {
  const { mutate } = useData();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const submit = () => {
    if (!title.trim()) return;
    const payload = { title, dueDate: due || null };
    setTitle("");
    setDue("");
    mutate((d) => addTask(d, payload));
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionTitle>Tasks</SectionTitle>
        <span className="font-mono text-xs text-text-secondary">
          {open.length} open
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Add a task…"
          className="w-full text-sm"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="flex-1 font-mono text-sm text-text-secondary"
            aria-label="Due date (optional)"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className={cx(btn.base, btn.primary)}
          >
            Add task
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {open.length === 0 && done.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-text-secondary">
            No tasks yet. Add your first one above.
          </p>
        ) : (
          open.map((t) => <TaskItem key={t.id} task={t} />)
        )}
      </div>

      {done.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="mt-2 px-1 text-[11px] uppercase tracking-wide text-text-secondary">
            Done · {done.length}
          </div>
          {done.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}
