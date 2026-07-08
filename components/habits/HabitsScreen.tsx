"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import {
  PALETTE,
  addHabit,
  deleteHabit,
  getHabits,
  habitLogIndex,
  habitMonthCount,
  toggleHabit,
} from "@/lib/store";
import {
  addMonths,
  dayInMonth,
  daysInMonth,
  formatDayLabel,
  formatMonthYear,
  startOfMonth,
  todayISO,
} from "@/lib/time";
import { btn, cx, Card, SectionTitle } from "../ui";
import { TallyMarks } from "./TallyMarks";

export function HabitsScreen() {
  const { db, ready, mutate } = useData();
  const today = todayISO();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  if (!ready) {
    return (
      <p className="py-16 text-center text-sm text-text-secondary">Loading…</p>
    );
  }

  const habits = getHabits(db);
  const logs = habitLogIndex(db);
  const monthPrefix = month.slice(0, 7);
  const dayCount = daysInMonth(month);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  const submit = () => {
    if (!name.trim()) return;
    const payload = { name, color };
    setName("");
    mutate((d) => addHabit(d, payload));
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionTitle>Habits</SectionTitle>

      {/* Add */}
      <Card className="flex flex-col gap-3 p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="New habit…"
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
            Add habit
          </button>
        </div>
      </Card>

      {habits.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm text-text-secondary">
          No habits yet. Add one above, then tick it off each day.
        </p>
      ) : (
        <>
          {/* Today */}
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-medium text-text-primary">Today</h3>
              <span className="font-mono text-xs text-text-secondary">
                {formatDayLabel(today)}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {habits.map((h) => {
                const done = logs.get(h.id)?.has(today) ?? false;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => mutate((d) => toggleHabit(d, h.id, today))}
                    aria-pressed={done}
                    className={cx(
                      "flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                      done
                        ? "border-transparent"
                        : "border-border hover:border-text-secondary",
                    )}
                    style={done ? { backgroundColor: `${h.color}22`, borderColor: h.color } : undefined}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: h.color,
                        backgroundColor: done ? h.color : "transparent",
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
                    <span className="flex-1 truncate text-sm text-text-primary">
                      {h.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Month grid */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-primary">Month</h3>
              <div className="flex items-center gap-2">
                <MonthArrow label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>
                  ‹
                </MonthArrow>
                <span className="min-w-[9ch] text-center font-mono text-xs text-text-primary">
                  {formatMonthYear(month)}
                </span>
                <MonthArrow label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
                  ›
                </MonthArrow>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border-b border-r border-border bg-bg px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                      Habit
                    </th>
                    {days.map((d) => {
                      const iso = dayInMonth(month, d);
                      return (
                        <th
                          key={d}
                          className={cx(
                            "border-b border-border px-0 py-1.5 font-mono text-[10px] font-normal",
                            iso === today ? "text-accent" : "text-text-secondary",
                          )}
                          style={{ minWidth: 24 }}
                        >
                          {d}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {habits.map((h) => {
                    const set = logs.get(h.id);
                    return (
                      <tr key={h.id}>
                        <th className="sticky left-0 z-10 max-w-[7.5rem] border-r border-border bg-bg px-2 py-1 text-left">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: h.color }}
                            />
                            <span className="truncate text-xs font-normal text-text-primary">
                              {h.name}
                            </span>
                          </span>
                        </th>
                        {days.map((d) => {
                          const iso = dayInMonth(month, d);
                          const done = set?.has(iso) ?? false;
                          const future = iso > today;
                          return (
                            <td key={d} className="p-0.5 text-center">
                              <button
                                type="button"
                                disabled={future}
                                aria-label={`${h.name} on ${iso}`}
                                aria-pressed={done}
                                onClick={() => mutate((db2) => toggleHabit(db2, h.id, iso))}
                                className={cx(
                                  "h-5 w-5 rounded-[4px] border transition-colors",
                                  future
                                    ? "cursor-not-allowed border-border/40"
                                    : done
                                      ? "border-transparent"
                                      : "border-border hover:border-text-secondary",
                                  iso === today && "ring-1 ring-accent",
                                )}
                                style={done ? { backgroundColor: h.color } : undefined}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-text-secondary">
              Tap any day to mark it. Future days are locked.
            </p>
          </section>

          {/* Tally table */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-text-primary">
              {formatMonthYear(month)} tally
            </h3>
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {habits.map((h) => {
                const count = habitMonthCount(logs.get(h.id), monthPrefix);
                return (
                  <div key={h.id} className="flex items-center gap-3 bg-surface p-3">
                    <span className="w-24 shrink-0 truncate text-sm text-text-primary">
                      {h.name}
                    </span>
                    <div className="min-w-0 flex-1">
                      <TallyMarks count={count} color={h.color} />
                    </div>
                    <span className="shrink-0 font-mono text-xs text-text-secondary">
                      {count}/{dayCount}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete ${h.name}`}
                      onClick={() => mutate((d) => deleteHabit(d, h.id))}
                      className="shrink-0 rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MonthArrow({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
    >
      {children}
    </button>
  );
}
