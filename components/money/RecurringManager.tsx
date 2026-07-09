"use client";

import { useState } from "react";
import type { RecurFrequency, TxKind } from "@/lib/types";
import { useData } from "../DataProvider";
import {
  addRecurring,
  deleteRecurring,
  getAccounts,
  getCategories,
  getRecurring,
  setRecurringActive,
} from "@/lib/store";
import { formatMoney, parseAmount } from "@/lib/money";
import { DAY_NAMES_SHORT, todayISO } from "@/lib/time";
import { btn, cx, Card } from "../ui";
import { Select } from "../Select";

const FREqS: RecurFrequency[] = ["DAILY", "WEEKLY", "MONTHLY"];

export function RecurringManager() {
  const { db, mutate } = useData();
  const currency = db.settings.currency;
  const rules = getRecurring(db);
  const categoryById = new Map(db.categories.map((c) => [c.id, c]));
  const accountById = new Map(db.accounts.map((a) => [a.id, a]));

  const [kind, setKind] = useState<TxKind>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [frequency, setFrequency] = useState<RecurFrequency>("MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [dayOfWeek, setDayOfWeek] = useState("1");

  const accounts = getAccounts(db);
  const categories = getCategories(db, kind);
  const [accountId, setAccountId] = useState<number | "">(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(categories[0]?.id ?? "");

  const minor = parseAmount(amount);
  const cats = getCategories(db, kind);
  const catValid = cats.some((c) => c.id === categoryId);
  const valid = minor !== null && item.trim() && accountId !== "" && catValid;

  const submit = () => {
    if (!valid || minor === null) return;
    const payload = {
      kind,
      amount: minor,
      accountId: Number(accountId),
      categoryId: Number(categoryId),
      item,
      frequency,
      dayOfMonth: Number(dayOfMonth) || 1,
      dayOfWeek: Number(dayOfWeek),
      startDate: todayISO(),
    };
    setAmount("");
    setItem("");
    mutate((d) => addRecurring(d, payload));
  };

  const describe = (r: (typeof rules)[number]): string => {
    if (r.frequency === "DAILY") return "every day";
    if (r.frequency === "WEEKLY") return `every ${DAY_NAMES_SHORT[r.day_of_week ?? 0]}`;
    return `on day ${r.day_of_month} each month`;
  };

  return (
    <Card className="flex flex-col gap-3 p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        Recurring
      </span>

      {rules.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {rules.map((r) => {
            const cat = categoryById.get(r.category_id);
            const acct = accountById.get(r.account_id);
            return (
              <div key={r.id} className={cx("flex items-center gap-2 py-2", !r.active && "opacity-50")}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat?.color ?? "#9A9A9A" }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-text-primary">{r.item}</div>
                  <div className="truncate font-mono text-[11px] text-text-secondary">
                    {describe(r)} · {cat?.name ?? "—"} · {acct?.name ?? "—"}
                  </div>
                </div>
                <span className={cx("shrink-0 font-mono text-xs", r.kind === "INCOME" ? "text-green" : "text-red-neon")}>
                  {r.kind === "INCOME" ? "+" : "−"}
                  {formatMoney(r.amount, currency)}
                </span>
                <button
                  type="button"
                  onClick={() => mutate((d) => setRecurringActive(d, r.id, !r.active))}
                  className={cx(btn.base, btn.ghost, "px-2 py-1 text-[11px]")}
                >
                  {r.active ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${r.item}`}
                  onClick={() => mutate((d) => deleteRecurring(d, r.id))}
                  className="shrink-0 rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {accounts.length === 0 || categories.length === 0 ? (
        <p className="text-xs text-text-secondary">Add an account and a category first.</p>
      ) : (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex rounded-md border border-border p-0.5">
            {(["EXPENSE", "INCOME"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  const first = getCategories(db, k)[0]?.id ?? "";
                  setCategoryId(first);
                }}
                className={cx(
                  "flex-1 rounded px-3 py-1 text-xs transition-colors",
                  k === kind ? "bg-surface text-text-primary" : "text-text-secondary",
                )}
              >
                {k === "EXPENSE" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-1.5">
              <span className="font-mono text-sm text-text-secondary">{currency}</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full font-mono text-sm"
              />
            </div>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Item (e.g. Rent)"
              className="flex-1 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Select
              ariaLabel="Category"
              className="flex-1"
              value={String(categoryId)}
              onChange={(v) => setCategoryId(Number(v))}
              options={categories.map((c) => ({ value: String(c.id), label: c.name, color: c.color }))}
            />
            <Select
              ariaLabel="Account"
              className="flex-1"
              value={String(accountId)}
              onChange={(v) => setAccountId(Number(v))}
              options={accounts.map((a) => ({ value: String(a.id), label: a.name, color: a.color }))}
            />
          </div>

          <div className="flex gap-2">
            <Select
              ariaLabel="Frequency"
              className="flex-1"
              value={frequency}
              onChange={(v) => setFrequency(v as RecurFrequency)}
              options={FREqS.map((f) => ({ value: f, label: f.charAt(0) + f.slice(1).toLowerCase() }))}
            />
            {frequency === "MONTHLY" && (
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                aria-label="Day of month"
                className="w-20 font-mono text-sm"
              />
            )}
            {frequency === "WEEKLY" && (
              <Select
                ariaLabel="Day of week"
                className="flex-1"
                value={dayOfWeek}
                onChange={setDayOfWeek}
                options={DAY_NAMES_SHORT.map((d, i) => ({ value: String(i), label: d }))}
              />
            )}
          </div>

          <button type="button" onClick={submit} disabled={!valid} className={cx(btn.base, btn.primary, "py-1.5 text-sm")}>
            Add recurring
          </button>
          <p className="text-[11px] text-text-secondary">
            Starts today. Due entries are added automatically when you open the app.
          </p>
        </div>
      )}
    </Card>
  );
}
