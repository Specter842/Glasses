"use client";

import { useState } from "react";
import type { LearningGoal, LearningResource } from "@/lib/types";
import { useData } from "../DataProvider";
import {
  addResource,
  deleteGoal,
  deleteResource,
  setGoalStatus,
  setResourceStatus,
} from "@/lib/store";
import { btn, cx, Card } from "../ui";
import { StatusChip } from "./StatusChip";

export function GoalCard({
  goal,
  resources,
}: {
  goal: LearningGoal;
  resources: LearningResource[];
}) {
  const { mutate } = useData();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  const done = resources.filter((r) => r.status === "DONE").length;
  const total = resources.length;

  const submit = () => {
    if (!title.trim() && !url.trim()) return;
    const payload = { goalId: goal.id, url, title, note };
    setUrl("");
    setTitle("");
    setNote("");
    mutate((d) => addResource(d, payload));
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      {/* Goal header */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {goal.title}
            </h3>
            {goal.category && (
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
                {goal.category}
              </span>
            )}
          </div>
          {/* Plain ratio — deliberately not a percentage bar. */}
          <p className="mt-1 font-mono text-xs text-text-secondary">
            {total === 0 ? "No resources yet" : `${done}/${total} resources done`}
          </p>
        </div>
        <StatusChip
          status={goal.status}
          onChange={(s) => mutate((d) => setGoalStatus(d, goal.id, s))}
        />
        <button
          type="button"
          aria-label="Delete goal"
          onClick={() => mutate((d) => deleteGoal(d, goal.id))}
          className="rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
        >
          ✕
        </button>
      </div>

      {/* Resources */}
      {resources.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {resources.map((r) => (
            <ResourceRow
              key={r.id}
              resource={r}
              onStatus={(s) => mutate((d) => setResourceStatus(d, r.id, s))}
              onDelete={() => mutate((d) => deleteResource(d, r.id))}
            />
          ))}
        </div>
      )}

      {/* One-line add */}
      <div className="flex flex-col gap-2 rounded-md border border-border bg-bg p-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Title"
            className="w-full text-sm sm:flex-1"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="URL"
            className="w-full font-mono text-sm sm:flex-1"
          />
        </div>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="One-line note"
            className="min-w-0 flex-1 text-sm"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() && !url.trim()}
            className={cx(btn.base, btn.primary, "shrink-0 px-3 py-1.5")}
          >
            Add resource
          </button>
        </div>
      </div>
    </Card>
  );
}

function ResourceRow({
  resource,
  onStatus,
  onDelete,
}: {
  resource: LearningResource;
  onStatus: (s: LearningResource["status"]) => void;
  onDelete: () => void;
}) {
  const done = resource.status === "DONE";
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-bg px-2 py-1.5">
      <StatusChip status={resource.status} onChange={onStatus} />
      <div className="min-w-0 flex-1">
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(
              "block truncate text-sm text-text-primary transition-colors hover:text-accent hover:underline",
              done && "line-through opacity-60",
            )}
          >
            {resource.title}
          </a>
        ) : (
          <span
            className={cx(
              "block truncate text-sm text-text-primary",
              done && "line-through opacity-60",
            )}
          >
            {resource.title}
          </span>
        )}
        {resource.note && (
          <div className="truncate text-[11px] text-text-secondary">
            {resource.note}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Delete resource"
        onClick={onDelete}
        className="shrink-0 rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
      >
        ✕
      </button>
    </div>
  );
}
