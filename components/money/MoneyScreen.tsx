"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import {
  accountBalance,
  deleteTransaction,
  getAccounts,
  getTransactions,
} from "@/lib/store";
import { budgetStatuses, categoryTotals, formatMoney, monthTotals } from "@/lib/money";
import { addMonths, formatDayLabel, formatMonthYear, startOfMonth, todayISO } from "@/lib/time";
import { cx, Card, SectionTitle } from "../ui";
import { TransactionForm } from "./TransactionForm";
import { ManageFinance } from "./ManageFinance";
import { BudgetManager } from "./BudgetManager";
import { RecurringManager } from "./RecurringManager";

export function MoneyScreen() {
  const { db, ready, mutate } = useData();
  const [month, setMonth] = useState(() => startOfMonth(todayISO()));

  if (!ready) {
    return (
      <p className="py-16 text-center text-sm text-text-secondary">Loading…</p>
    );
  }

  const currency = db.settings.currency;
  const monthPrefix = month.slice(0, 7);
  const txs = getTransactions(db, monthPrefix);
  const totals = monthTotals(txs);
  const spendByCategory = categoryTotals(txs, "EXPENSE");
  const accounts = getAccounts(db);

  const categoryById = new Map(db.categories.map((c) => [c.id, c]));
  const accountById = new Map(db.accounts.map((a) => [a.id, a]));

  const breakdown = [...spendByCategory.entries()]
    .map(([id, total]) => ({ category: categoryById.get(id), total }))
    .filter((r) => r.category)
    .sort((a, b) => b.total - a.total);
  const biggest = breakdown[0]?.total ?? 0;

  // Budget warnings for the *current* month only (past months are history).
  const isThisMonth = monthPrefix === startOfMonth(todayISO()).slice(0, 7);
  const alerts = isThisMonth
    ? budgetStatuses(db.budgets, spendByCategory)
        .filter((s) => s.near || s.over)
        .sort((a, b) => b.ratio - a.ratio)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Money</SectionTitle>
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

      {/* Month totals */}
      <Card className="grid grid-cols-3 gap-2 p-3">
        <Total label="In" value={formatMoney(totals.income, currency)} tone="green" />
        <Total label="Out" value={formatMoney(totals.expense, currency)} tone="red" />
        <Total
          label="Net"
          value={formatMoney(totals.net, currency)}
          tone={totals.net < 0 ? "red" : totals.net > 0 ? "green" : "muted"}
        />
      </Card>

      {/* Budget warnings — current month only */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {alerts.map((s) => {
            const cat = categoryById.get(s.categoryId);
            return (
              <div
                key={s.categoryId}
                className={cx(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
                  s.over
                    ? "border-red-neon/40 bg-red-neon/10 text-red-neon"
                    : "border-[#FFB020]/40 bg-[#FFB020]/10 text-[#FFB020]",
                )}
              >
                <span className="flex-1">
                  {s.over ? "Over budget" : "Nearing budget"} on{" "}
                  <span className="font-medium">{cat?.name ?? "—"}</span>
                </span>
                <span className="shrink-0 font-mono">
                  {formatMoney(s.spent, currency)} / {formatMoney(s.limit, currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Account balances */}
      {accounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {accounts.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: a.color }}
              />
              <span className="text-xs text-text-secondary">{a.name}</span>
              <span className="font-mono text-xs text-text-primary">
                {formatMoney(accountBalance(db, a.id), currency)}
              </span>
            </span>
          ))}
        </div>
      )}

      <TransactionForm />

      {/* Where the money went */}
      {breakdown.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-text-primary">Spending by category</h3>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {breakdown.map(({ category, total }) => (
              <div key={category!.id} className="flex flex-col gap-1 bg-surface p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: category!.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                    {category!.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-text-primary">
                    {formatMoney(total, currency)}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${biggest > 0 ? (total / biggest) * 100 : 0}%`,
                      backgroundColor: category!.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ledger */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">Transactions</h3>
          <span className="font-mono text-xs text-text-secondary">{txs.length}</span>
        </div>
        {txs.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-text-secondary">
            Nothing logged in {formatMonthYear(month)} yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {txs.map((t) => {
              const cat = categoryById.get(t.category_id);
              const acct = accountById.get(t.account_id);
              const income = t.kind === "INCOME";
              return (
                <div key={t.id} className="flex items-center gap-2 bg-surface p-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat?.color ?? "#9A9A9A" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-text-primary">{t.item}</div>
                    <div className="truncate font-mono text-[11px] text-text-secondary">
                      {cat?.name ?? "—"} · {acct?.name ?? "—"} · {formatDayLabel(t.date)}
                      {t.note ? ` · ${t.note}` : ""}
                    </div>
                  </div>
                  <span
                    className={cx(
                      "shrink-0 font-mono text-sm",
                      income ? "text-green" : "text-red-neon",
                    )}
                  >
                    {income ? "+" : "−"}
                    {formatMoney(t.amount, currency)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete ${t.item}`}
                    onClick={() => mutate((d) => deleteTransaction(d, t.id))}
                    className="shrink-0 rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BudgetManager />
      <RecurringManager />
      <ManageFinance />
    </div>
  );
}

function Total({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "muted";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <span
        className={cx(
          "truncate font-mono text-sm",
          tone === "green" && "text-green",
          tone === "red" && "text-red-neon",
          tone === "muted" && "text-text-primary",
        )}
      >
        {value}
      </span>
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
