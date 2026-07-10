"use client";

import { useState } from "react";
import type { WishlistItem } from "@/lib/types";
import { useData } from "../DataProvider";
import {
  addWishlistItem,
  deleteWishlistItem,
  getWishlist,
  toggleWishlistBought,
} from "@/lib/store";
import { formatMoney, parseAmount } from "@/lib/money";
import { btn, cx, Card, SectionTitle } from "../ui";
import { MoneyTabs } from "./MoneyTabs";

export function WishlistScreen() {
  const { db, ready, mutate } = useData();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [priority, setPriority] = useState<WishlistItem["priority"]>("WANT");
  const [note, setNote] = useState("");

  if (!ready) {
    return (
      <p className="py-16 text-center text-sm text-text-secondary">Loading…</p>
    );
  }

  const currency = db.settings.currency;
  const items = getWishlist(db);
  const open = items.filter((w) => !w.bought);
  const bought = items.filter((w) => w.bought);
  const outstanding = open.reduce((s, w) => s + (w.amount ?? 0), 0);

  const submit = () => {
    if (!name.trim()) return;
    const payload = { name, amount: parseAmount(amount), priority, note };
    setName("");
    setAmount("");
    setNote("");
    mutate((d) => addWishlistItem(d, payload));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Money</SectionTitle>
        {outstanding > 0 && (
          <span className="font-mono text-xs text-text-secondary">
            {formatMoney(outstanding, currency)} to buy
          </span>
        )}
      </div>

      <MoneyTabs />

      {/* Add */}
      <Card className="flex flex-col gap-2 p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Something to buy…"
          className="w-full text-sm"
        />
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <span className="font-mono text-sm text-text-secondary">{currency}</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Est. (optional)"
              className="w-full font-mono text-sm"
            />
          </div>
          <div className="flex rounded-md border border-border p-0.5">
            {(["NEED", "WANT"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cx(
                  "rounded px-2.5 py-1 text-xs capitalize transition-colors",
                  p === priority
                    ? p === "NEED"
                      ? "bg-red-neon/15 text-red-neon"
                      : "bg-accent/15 text-accent"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {p === "NEED" ? "Need" : "Want"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="min-w-0 flex-1 text-sm"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className={cx(btn.base, btn.primary, "shrink-0 px-3 py-1.5")}
          >
            Add
          </button>
        </div>
      </Card>

      {items.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm text-text-secondary">
          Nothing on your wishlist yet. Add things you want or need to buy.
        </p>
      ) : (
        <>
          {open.length > 0 && (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {open.map((w) => (
                <WishRow key={w.id} item={w} currency={currency} />
              ))}
            </div>
          )}

          {bought.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="px-1 text-[11px] uppercase tracking-wide text-text-secondary">
                Bought · {bought.length}
              </div>
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {bought.map((w) => (
                  <WishRow key={w.id} item={w} currency={currency} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WishRow({ item, currency }: { item: WishlistItem; currency: string }) {
  const { mutate } = useData();
  const need = item.priority === "NEED";
  return (
    <div className="flex items-center gap-3 bg-surface p-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.bought}
        aria-label={item.bought ? "Mark not bought" : "Mark bought"}
        onClick={() => mutate((d) => toggleWishlistBought(d, item.id))}
        className={cx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          item.bought
            ? "border-green bg-green text-black"
            : "border-text-secondary hover:border-text-primary",
        )}
      >
        {item.bought && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
            <path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "truncate text-sm",
              item.bought ? "text-text-secondary line-through" : "text-text-primary",
            )}
          >
            {item.name}
          </span>
          {!item.bought && (
            <span
              className={cx(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                need ? "bg-red-neon/15 text-red-neon" : "bg-accent/15 text-accent",
              )}
            >
              {need ? "Need" : "Want"}
            </span>
          )}
        </div>
        {item.note && (
          <div className="truncate text-[11px] text-text-secondary">{item.note}</div>
        )}
      </div>

      {item.amount != null && (
        <span className="shrink-0 font-mono text-sm text-text-primary">
          {formatMoney(item.amount, currency)}
        </span>
      )}
      <button
        type="button"
        aria-label={`Delete ${item.name}`}
        onClick={() => mutate((d) => deleteWishlistItem(d, item.id))}
        className="shrink-0 rounded px-1.5 py-1 text-text-secondary transition-colors hover:text-red-neon"
      >
        ✕
      </button>
    </div>
  );
}
