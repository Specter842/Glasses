"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Task } from "@/lib/types";
import { useData } from "../DataProvider";
import { addTask, reorderTasks } from "@/lib/store";
import { btn, cx, SectionTitle } from "../ui";
import { TaskItem } from "./TaskItem";

export function TaskPanel({ tasks }: { tasks: Task[] }) {
  const { mutate } = useData();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  // Drag-to-reorder: `order` is the live working order of open task ids
  // while a drag is in progress; it resyncs from `open` whenever nothing is
  // being dragged, so external changes (add/delete/toggle) stay reflected.
  const [order, setOrder] = useState<number[]>(() => open.map((t) => t.id));
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef(0);
  const itemRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    if (draggingId === null) setOrder(open.map((t) => t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, draggingId]);

  const openById = new Map(open.map((t) => [t.id, t]));
  const orderedOpen = order
    .map((id) => openById.get(id))
    .filter((t): t is Task => t !== undefined);

  const movePointer = (clientY: number, dragId: number) => {
    const others = order.filter((id) => id !== dragId);
    let targetIndex = others.length;
    for (let i = 0; i < others.length; i++) {
      const el = itemRefs.current.get(others[i]);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        targetIndex = i;
        break;
      }
    }
    const next = [...others];
    next.splice(targetIndex, 0, dragId);
    setOrder((prev) => (next.join(",") === prev.join(",") ? prev : next));
  };

  const handlePointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    id: number,
  ) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    setDraggingId(id);
    setDragOffset(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (
    e: ReactPointerEvent<HTMLButtonElement>,
    id: number,
  ) => {
    if (draggingId !== id) return;
    setDragOffset(e.clientY - dragStartY.current);
    movePointer(e.clientY, id);
  };
  const endDrag = (id: number) => {
    if (draggingId !== id) return;
    mutate((d) => reorderTasks(d, order));
    setDraggingId(null);
    setDragOffset(0);
  };

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
          orderedOpen.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              ref={(el) => {
                if (el) itemRefs.current.set(t.id, el);
                else itemRefs.current.delete(t.id);
              }}
              dragging={draggingId === t.id}
              style={
                draggingId === t.id
                  ? { transform: `translateY(${dragOffset}px)` }
                  : undefined
              }
              dragHandleProps={
                orderedOpen.length > 1
                  ? {
                      onPointerDown: (e) => handlePointerDown(e, t.id),
                      onPointerMove: (e) => handlePointerMove(e, t.id),
                      onPointerUp: () => endDrag(t.id),
                      onPointerCancel: () => endDrag(t.id),
                    }
                  : undefined
              }
            />
          ))
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
