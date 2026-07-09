"use client";

import { useEffect, useState } from "react";
import type { TxKind } from "@/lib/types";
import { useData } from "../DataProvider";
import { addTransaction, getAccounts, getCategories } from "@/lib/store";
import { parseAmount, suggestItems } from "@/lib/money";
import { todayISO } from "@/lib/time";
import { btn, cx, Card } from "../ui";
import { Select } from "../Select";
import { ItemSuggest } from "./ItemSuggest";

export function TransactionForm() {
  const { db, mutate } = useData();
  const today = todayISO();

  const [kind, setKind] = useState<TxKind>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);

  const accounts = getAccounts(db);
  const categories = getCategories(db, kind);

  const [accountId, setAccountId] = useState<number | "">(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(categories[0]?.id ?? "");

  // Switching Expense↔Income changes the category list under us.
  useEffect(() => {
    if (!categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? "");
    }
  }, [categories, categoryId]);

  const minor = parseAmount(amount);
  const valid = minor !== null && item.trim() && accountId !== "" && categoryId !== "";

  const suggestions =
    categoryId === "" ? [] : suggestItems(db, Number(categoryId), item, today);

  const submit = () => {
    if (!valid || minor === null) return;
    const payload = {
      date,
      kind,
      amount: minor,
      accountId: Number(accountId),
      categoryId: Number(categoryId),
      item,
      note,
    };
    setAmount("");
    setItem("");
    setNote("");
    mutate((d) => addTransaction(d, payload));
  };

  if (accounts.length === 0 || categories.length === 0) {
    return (
      <Card className="px-4 py-3 text-sm text-text-secondary">
        Add at least one account and one {kind === "EXPENSE" ? "expense" : "income"}{" "}
        category below before logging anything.
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-3">
      {/* Expense / Income */}
      <div className="flex rounded-md border border-border p-0.5">
        {(["EXPENSE", "INCOME"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cx(
              "flex-1 rounded px-3 py-1.5 text-sm capitalize transition-colors",
              k === kind
                ? k === "EXPENSE"
                  ? "bg-red-neon/15 text-red-neon"
                  : "bg-green/15 text-green"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {k === "EXPENSE" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-text-secondary">Amount</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm text-text-secondary">
              {db.settings.currency}
            </span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full font-mono text-sm"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-secondary">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="font-mono text-sm"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-text-secondary">Category</span>
        <Select
          ariaLabel="Category"
          value={String(categoryId)}
          onChange={(v) => setCategoryId(Number(v))}
          options={categories.map((c) => ({
            value: String(c.id),
            label: c.name,
            color: c.color,
          }))}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-text-secondary">Item</span>
        <ItemSuggest value={item} onChange={setItem} suggestions={suggestions} />
      </label>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-text-secondary">Account</span>
          <Select
            ariaLabel="Account"
            value={String(accountId)}
            onChange={(v) => setAccountId(Number(v))}
            options={accounts.map((a) => ({
              value: String(a.id),
              label: a.name,
              color: a.color,
            }))}
          />
        </div>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-text-secondary">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optional"
            className="w-full text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!valid}
        className={cx(btn.base, btn.primary, "py-2")}
      >
        {kind === "EXPENSE" ? "Log expense" : "Log income"}
      </button>
    </Card>
  );
}
