"use client";

import { forwardRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Task } from "@/lib/types";
import { useData } from "../DataProvider";
import { toggleTask, deleteTask, updateTask, isTaskOverdue } from "@/lib/store";
import { formatDayLabel } from "@/lib/time";
import { btn, cx } from "../ui";

interface DragHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLButtonElement>) => void;
}

export const TaskItem = forwardRef<
  HTMLDivElement,
  {
    task: Task;
    style?: React.CSSProperties;
    dragging?: boolean;
    dragHandleProps?: DragHandleProps;
  }
>(function TaskItem({ task, style, dragging, dragHandleProps }, ref) {
  const { mutate } = useData();
  const done = task.done === 1;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.due_date ?? "");

  const overdue = isTaskOverdue(task);

  const saveEdit = () => {
    if (!title.trim()) return;
    mutate((d) => updateTask(d, { id: task.id, title, dueDate: due || null }));
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        ref={ref}
        className="flex flex-col gap-2 rounded-md border border-border bg-surface p-2"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
          className="w-full text-sm"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="flex-1 font-mono text-sm text-text-secondary"
          />
          <button
            type="button"
            onClick={saveEdit}
            className={cx(btn.base, btn.primary, "px-3 py-1.5")}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={cx(btn.base, btn.ghost)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={style}
      className={cx(
        "group flex items-center gap-3 rounded-md border px-2 py-2 transition-colors",
        dragging
          ? "relative z-10 border-border bg-surface shadow-lg"
          : "border-transparent hover:border-border hover:bg-surface",
      )}
    >
      {dragHandleProps && (
        <button
          type="button"
          aria-label="Drag to reorder"
          className="-ml-1 flex shrink-0 touch-none items-center justify-center rounded p-1 text-text-secondary active:cursor-grabbing"
          {...dragHandleProps}
        >
          <svg viewBox="0 0 12 20" className="h-4 w-3" fill="currentColor">
            <circle cx="3" cy="3" r="1.3" />
            <circle cx="9" cy="3" r="1.3" />
            <circle cx="3" cy="10" r="1.3" />
            <circle cx="9" cy="10" r="1.3" />
            <circle cx="3" cy="17" r="1.3" />
            <circle cx="9" cy="17" r="1.3" />
          </svg>
        </button>
      )}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? "Mark not done" : "Mark done"}
        onClick={() => mutate((d) => toggleTask(d, task.id, !done))}
        className={cx(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          done
            ? "border-accent bg-accent text-white"
            : "border-text-secondary hover:border-text-primary",
        )}
      >
        {done && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
            <path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <span
          className={cx(
            "task-strike inline text-sm",
            done ? "text-text-secondary" : "text-text-primary",
          )}
          data-done={done}
        >
          {task.title}
        </span>
        {task.due_date ? (
          <span
            className={cx(
              "ml-2 font-mono text-[11px]",
              overdue ? "text-red-neon" : "text-text-secondary",
            )}
          >
            {overdue ? "overdue · " : "due "}
            {formatDayLabel(task.due_date)}
          </span>
        ) : (
          overdue && (
            <span className="ml-2 font-mono text-[11px] text-red-neon">
              overdue
            </span>
          )
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cx(btn.base, btn.ghost, "px-2 py-1 text-xs")}
        >
          Edit
        </button>
        <button
          type="button"
          aria-label="Delete task"
          onClick={() => mutate((d) => deleteTask(d, task.id))}
          className="rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-text-primary"
        >
          ✕
        </button>
      </div>
    </div>
  );
});
