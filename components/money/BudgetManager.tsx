"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import {
  categoryTotals,
  formatMoney,
  parseAmount,
} from "@/lib/money";
import { getCategories, getBudget, getTransactions, setBudget } from "@/lib/store";
import { startOfMonth, todayISO } from "@/lib/time";
import { btn, cx, Card } from "../ui";

/**
 * Set a monthly limit per expense category. Progress is shown against *this*
 * month's spend, coloured green → amber (≥80%) → red (over).
 */
export function BudgetManager() {
  const { db, mutate } = useData();
  const currency = db.settings.currency;
  const categories = getCategories(db, "EXPENSE");
  const monthPrefix = startOfMonth(todayISO()).slice(0, 7);
  const spent = categoryTotals(getTransactions(db, monthPrefix), "EXPENSE");

  const [drafts, setDrafts] = useState<Record<number, string>>({});

  return (
    <Card className="flex flex-col gap-3 p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        Monthly budgets
      </span>

      {categories.map((c) => {
        const budget = getBudget(db, c.id);
        const used = spent.get(c.id) ?? 0;
        const ratio = budget ? used / budget.amount : 0;
        const tone = !budget
          ? "muted"
          : used > budget.amount
            ? "red"
            : ratio >= 0.8
              ? "amber"
              : "green";
        const draft = drafts[c.id] ?? "";

        return (
          <div key={c.id} className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="flex-1 truncate text-sm text-text-primary">{c.name}</span>
              {budget ? (
                <span
                  className={cx(
                    "font-mono text-xs",
                    tone === "red" && "text-red-neon",
                    tone === "amber" && "text-[#FFB020]",
                    tone === "green" && "text-green",
                  )}
                >
                  {formatMoney(used, currency)} / {formatMoney(budget.amount, currency)}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-text-secondary">no limit</span>
              )}
            </div>

            {budget && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-bg">
                <div
                  className={cx(
                    "h-full rounded-full transition-[width]",
                    tone === "red" ? "bg-red-neon" : tone === "amber" ? "bg-[#FFB020]" : "bg-green",
                  )}
                  style={{ width: `${Math.min(100, ratio * 100)}%` }}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-1.5">
                <span className="font-mono text-xs text-text-secondary">{currency}</span>
                <input
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                  inputMode="decimal"
                  placeholder={budget ? formatMoney(budget.amount, "") : "Set limit"}
                  className="w-full font-mono text-sm"
                />
              </div>
              <button
                type="button"
                disabled={parseAmount(draft) === null}
                onClick={() => {
                  const amt = parseAmount(draft);
                  if (amt === null) return;
                  setDrafts((d) => ({ ...d, [c.id]: "" }));
                  mutate((db2) => setBudget(db2, c.id, amt));
                }}
                className={cx(btn.base, btn.primary, "px-3 py-1 text-xs")}
              >
                {budget ? "Update" : "Set"}
              </button>
              {budget && (
                <button
                  type="button"
                  aria-label={`Remove ${c.name} budget`}
                  onClick={() => mutate((db2) => setBudget(db2, c.id, 0))}
                  className="rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
