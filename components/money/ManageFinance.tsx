"use client";

import { useState } from "react";
import type { TxKind } from "@/lib/types";
import { useData } from "../DataProvider";
import {
  PALETTE,
  accountBalance,
  accountInUse,
  addAccount,
  addCategory,
  categoryInUse,
  deleteAccount,
  deleteCategory,
  getAccounts,
  getCategories,
} from "@/lib/store";
import { formatMoney, parseAmount } from "@/lib/money";
import { btn, cx, Card } from "../ui";

// Accounts and Categories are top-level components on purpose: defining them
// inside ManageFinance would remount them (losing input focus) every time the
// store changes.

export function ManageFinance() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(btn.base, btn.outline, "self-start px-3 py-1.5 text-xs")}
      >
        Manage accounts & categories
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">
          Accounts & categories
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={cx(btn.base, btn.ghost, "text-xs")}
        >
          Done
        </button>
      </div>
      <Accounts />
      <Categories />
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Colour ${c}`}
          onClick={() => onChange(c)}
          className={cx(
            "h-5 w-5 rounded-full border-2 transition-colors",
            value === c ? "border-white" : "border-transparent",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function Accounts() {
  const { db, mutate } = useData();
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [color, setColor] = useState(PALETTE[1]);
  const accounts = getAccounts(db);
  const currency = db.settings.currency;

  const submit = () => {
    if (!name.trim()) return;
    const payload = { name, color, openingBalance: parseAmount(opening) ?? 0 };
    setName("");
    setOpening("");
    mutate((d) => addAccount(d, payload));
  };

  return (
    <Card className="flex flex-col gap-3 p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        Accounts
      </span>

      {accounts.map((a) => {
        const used = accountInUse(db, a.id);
        return (
          <div key={a.id} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: a.color }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
              {a.name}
            </span>
            <span className="shrink-0 font-mono text-xs text-text-secondary">
              {formatMoney(accountBalance(db, a.id), currency)}
            </span>
            <button
              type="button"
              disabled={used}
              title={used ? "Has transactions — can't delete" : "Delete account"}
              aria-label={`Delete ${a.name}`}
              onClick={() => mutate((d) => deleteAccount(d, a.id))}
              className={cx(
                "shrink-0 rounded px-1.5 py-1 transition-colors",
                used
                  ? "cursor-not-allowed text-text-secondary/30"
                  : "text-text-secondary hover:text-red-neon",
              )}
            >
              ✕
            </button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Account name"
          className="min-w-[7rem] flex-1 text-sm"
        />
        <input
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          inputMode="decimal"
          placeholder="Opening"
          className="w-24 font-mono text-sm"
        />
        <ColorPicker value={color} onChange={setColor} />
        <button
          type="button"
          disabled={!name.trim()}
          onClick={submit}
          className={cx(btn.base, btn.primary, "px-3 py-1.5 text-xs")}
        >
          Add
        </button>
      </div>
    </Card>
  );
}

function Categories() {
  const { db, mutate } = useData();
  const [kind, setKind] = useState<TxKind>("EXPENSE");
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const categories = getCategories(db, kind);

  const submit = () => {
    if (!name.trim()) return;
    const payload = { name, kind, color };
    setName("");
    mutate((d) => addCategory(d, payload));
  };

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Categories
        </span>
        <div className="flex rounded-md border border-border p-0.5">
          {(["EXPENSE", "INCOME"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cx(
                "rounded px-2 py-0.5 text-[11px] transition-colors",
                k === kind
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {k === "EXPENSE" ? "Expense" : "Income"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => {
          const used = categoryInUse(db, c.id);
          return (
            <span
              key={c.id}
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-xs text-text-primary">{c.name}</span>
              <button
                type="button"
                disabled={used}
                title={used ? "Used by transactions — can't delete" : "Delete"}
                aria-label={`Delete ${c.name}`}
                onClick={() => mutate((d) => deleteCategory(d, c.id))}
                className={cx(
                  "transition-colors",
                  used
                    ? "cursor-not-allowed text-text-secondary/30"
                    : "text-text-secondary hover:text-red-neon",
                )}
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={`New ${kind === "EXPENSE" ? "expense" : "income"} category`}
          className="min-w-[8rem] flex-1 text-sm"
        />
        <ColorPicker value={color} onChange={setColor} />
        <button
          type="button"
          disabled={!name.trim()}
          onClick={submit}
          className={cx(btn.base, btn.primary, "px-3 py-1.5 text-xs")}
        >
          Add
        </button>
      </div>
    </Card>
  );
}
