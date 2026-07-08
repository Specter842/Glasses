"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { addGoal, getGoals, getResourcesForGoal } from "@/lib/store";
import { btn, cx, Card, SectionTitle } from "../ui";
import { GoalCard } from "./GoalCard";

export function LearningScreen() {
  const { db, ready, mutate } = useData();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  if (!ready) {
    return (
      <p className="py-16 text-center text-sm text-text-secondary">Loading…</p>
    );
  }

  const goals = getGoals(db);

  const submit = () => {
    if (!title.trim()) return;
    const payload = { title, category: category || null };
    setTitle("");
    setCategory("");
    mutate((d) => addGoal(d, payload));
  };

  const totalDone = db.resources.filter((r) => r.status === "DONE").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Learning</SectionTitle>
        {db.resources.length > 0 && (
          <span className="font-mono text-xs text-text-secondary">
            {totalDone}/{db.resources.length} done
          </span>
        )}
      </div>

      {/* Add goal */}
      <Card className="flex flex-col gap-2 p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="New learning goal…"
          className="w-full text-sm"
        />
        <div className="flex gap-2">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Category (optional)"
            className="min-w-0 flex-1 text-sm"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className={cx(btn.base, btn.primary, "shrink-0")}
          >
            Add goal
          </button>
        </div>
      </Card>


      {/* Goals */}
      {goals.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm text-text-secondary">
          No learning goals yet. Add one above, then attach the links you mean to
          work through.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              resources={getResourcesForGoal(db, g.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
