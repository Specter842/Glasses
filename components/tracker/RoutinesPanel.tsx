"use client";

import { useState } from "react";
import type { RoutineItem } from "@/lib/types";
import { useData } from "../DataProvider";
import {
  PALETTE,
  addRoutine,
  deleteRoutine,
  addRoutineItem,
  deleteRoutineItem,
  toggleRoutineItemLog,
  getRoutines,
  getRoutineItems,
  getRoutineItemsForDay,
  routineLogIndex,
} from "@/lib/store";
import { DAY_NAMES, dayOfWeek, formatTime, todayISO } from "@/lib/time";
import { btn, cx, Card, SectionTitle } from "../ui";
import { Select } from "../Select";

export function RoutinesPanel() {
  const { db, mutate } = useData();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  const routines = getRoutines(db);
  const routine = routines.find((r) => r.id === selectedId) ?? routines[0] ?? null;

  const submit = () => {
    if (!name.trim()) return;
    const payload = { name, color };
    setName("");
    mutate((d) => addRoutine(d, payload));
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3 p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="New routine… (Gym, Diet, Skincare)"
          className="w-full text-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                onClick={() => setColor(c)}
                className={cx(
                  "h-6 w-6 rounded-full border-2 transition-colors",
                  color === c ? "border-white" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className={cx(btn.base, btn.primary, "px-3 py-1.5")}
          >
            Add routine
          </button>
        </div>
      </Card>

      {routines.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm text-text-secondary">
          No routines yet. Add one above — Gym, Diet, whatever you want to
          template out by day.
        </p>
      ) : (
        routine && (
          <>
            <div className="flex items-center gap-2">
              <Select
                className="flex-1"
                ariaLabel="Routine"
                value={String(routine.id)}
                onChange={(v) => setSelectedId(Number(v))}
                options={routines.map((r) => ({
                  value: String(r.id),
                  label: r.name,
                  color: r.color,
                }))}
              />
              <button
                type="button"
                aria-label={`Delete ${routine.name}`}
                onClick={() => {
                  setSelectedId(null);
                  mutate((d) => deleteRoutine(d, routine.id));
                }}
                className="shrink-0 rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
              >
                ✕
              </button>
            </div>

            <RoutineToday routineId={routine.id} color={routine.color} />
            <RoutineTemplate routineId={routine.id} />
          </>
        )
      )}
    </div>
  );
}

function RoutineToday({
  routineId,
  color,
}: {
  routineId: number;
  color: string;
}) {
  const { db, mutate } = useData();
  const today = todayISO();
  const items = getRoutineItemsForDay(db, routineId, dayOfWeek(today));
  const logs = routineLogIndex(db);

  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>Today</SectionTitle>
      {items.length === 0 ? (
        <p className="px-1 py-4 text-sm text-text-secondary">
          Nothing scheduled today. Add items below.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => {
            const done = logs.get(item.id)?.has(today) ?? false;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => mutate((d) => toggleRoutineItemLog(d, item.id, today))}
                aria-pressed={done}
                className={cx(
                  "flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                  done
                    ? "border-transparent"
                    : "border-border hover:border-text-secondary",
                )}
                style={done ? { backgroundColor: `${color}22`, borderColor: color } : undefined}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: color,
                    backgroundColor: done ? color : "transparent",
                  }}
                >
                  {done && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                      <path
                        d="M2.5 6.5L5 9L9.5 3.5"
                        stroke="#000"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary">
                    {item.title}
                  </span>
                  {(item.time || item.note) && (
                    <span className="block truncate font-mono text-[11px] text-text-secondary">
                      {item.time ? formatTime(item.time) : ""}
                      {item.time && item.note ? " · " : ""}
                      {item.note ?? ""}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RoutineTemplate({ routineId }: { routineId: number }) {
  const { db, mutate } = useData();
  const [dow, setDow] = useState(1); // Monday
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  const items = getRoutineItems(db, routineId);

  const submit = () => {
    if (!title.trim()) return;
    const payload = {
      routineId,
      dayOfWeek: dow,
      time: time || null,
      title,
      note: note || null,
    };
    setTitle("");
    setNote("");
    mutate((d) => addRoutineItem(d, payload));
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Weekly template</SectionTitle>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[8rem] flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Day</span>
            <Select
              ariaLabel="Day of week"
              value={String(dow)}
              onChange={(v) => setDow(Number(v))}
              options={DAY_NAMES.map((d, i) => ({ value: String(i), label: d }))}
            />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              Time (optional)
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="font-mono text-sm"
            />
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Push-ups 3x12"
              className="w-full text-sm"
            />
          </label>
          <label className="flex min-w-[8rem] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">
              Note (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="optional"
              className="w-full text-sm"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className={cx(btn.base, btn.primary)}
          >
            Add item
          </button>
        </div>
      </Card>

      {items.length === 0 ? (
        <p className="px-1 py-4 text-sm text-text-secondary">
          No items yet. Add the first one above.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DAY_NAMES.map((dayName, d) => {
            const dayItems = items.filter((i) => i.day_of_week === d);
            if (dayItems.length === 0) return null;
            return (
              <Card key={d} className="p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  {dayName}
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayItems.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ItemRow({ item }: { item: RoutineItem }) {
  const { mutate } = useData();
  return (
    <div className="flex items-center gap-2 rounded bg-bg px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text-primary">{item.title}</div>
        {(item.time || item.note) && (
          <div className="truncate font-mono text-[11px] text-text-secondary">
            {item.time ? formatTime(item.time) : ""}
            {item.time && item.note ? " · " : ""}
            {item.note ?? ""}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Delete item"
        onClick={() => mutate((d) => deleteRoutineItem(d, item.id))}
        className="rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
      >
        ✕
      </button>
    </div>
  );
}
