import type { Transaction, TxKind, Recurring, Budget } from "./types";
import type { DB } from "./store";
import { addDays, addMonths, dayInMonth, daysInMonth, todayISO } from "./time";

// Pure money helpers. Amounts are integer minor units (paise) everywhere;
// they only become a decimal string at the edge, for display.

const MINOR = 100;

/** "12.50" / "1,234" / "₹99" → 1250 / 123400 / 9900. null when unparseable. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned || cleaned === ".") return null;
  if ((cleaned.match(/\./g) ?? []).length > 1) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * MINOR);
}

/** 123450 → "1,234.50" (grouping from the runtime locale). */
export function formatAmount(minor: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / MINOR);
}

export function formatMoney(minor: number, currency: string): string {
  const sign = minor < 0 ? "-" : "";
  return `${sign}${currency}${formatAmount(Math.abs(minor))}`;
}

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
}

export function monthTotals(txs: Transaction[]): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.kind === "INCOME") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

/** Per-category totals for one kind, biggest first. */
export function categoryTotals(
  txs: Transaction[],
  kind: TxKind,
): Map<number, number> {
  const map = new Map<number, number>();
  for (const t of txs) {
    if (t.kind !== kind) continue;
    map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount);
  }
  return map;
}

// ---- Item suggestions ----
//
// The differentiator: once you've logged "gum" under Food, typing in Food
// offers it again. Ranked by how *often* you've bought it, with recency as a
// tie-breaker, so a thing you buy weekly outranks a one-off from yesterday.
// Entirely deterministic — no model, no network.

interface Tallied {
  label: string; // original casing of the most recent use
  count: number;
  lastUsed: string; // ISO date
}

const RECENCY_HALF_LIFE_DAYS = 14;

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime();
  const b = new Date(`${toISO}T00:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** score = times bought + a recency bonus in (0,1]. Frequency dominates. */
function score(t: Tallied, today: string): number {
  const age = daysBetween(t.lastUsed, today);
  return t.count + 1 / (1 + age / RECENCY_HALF_LIFE_DAYS);
}

export function suggestItems(
  db: DB,
  categoryId: number,
  query: string,
  today: string,
  limit = 6,
): string[] {
  const byKey = new Map<string, Tallied>();
  for (const t of db.transactions) {
    if (t.category_id !== categoryId) continue;
    const key = t.item.trim().toLowerCase();
    if (!key) continue;
    const seen = byKey.get(key);
    if (!seen) {
      byKey.set(key, { label: t.item.trim(), count: 1, lastUsed: t.date });
    } else {
      seen.count++;
      if (t.date > seen.lastUsed) {
        seen.lastUsed = t.date;
        seen.label = t.item.trim(); // freshest spelling wins
      }
    }
  }

  const q = query.trim().toLowerCase();
  const candidates = [...byKey.values()].filter(
    (t) => !q || t.label.toLowerCase().includes(q),
  );

  return candidates
    .sort((a, b) => {
      if (q) {
        // A prefix match is what the user is reaching for.
        const ap = a.label.toLowerCase().startsWith(q) ? 1 : 0;
        const bp = b.label.toLowerCase().startsWith(q) ? 1 : 0;
        if (ap !== bp) return bp - ap;
      }
      const s = score(b, today) - score(a, today);
      if (s !== 0) return s;
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit)
    .map((t) => t.label);
}

// ---- Budgets ----

export interface BudgetStatus {
  categoryId: number;
  limit: number; // minor units, per month
  spent: number;
  ratio: number; // spent / limit, >1 when over
  over: boolean;
  near: boolean; // >= 80% and not yet over
}

const NEAR_THRESHOLD = 0.8;

/** Status for every budgeted category, given that month's expense totals. */
export function budgetStatuses(
  budgets: Budget[],
  spentByCategory: Map<number, number>,
): BudgetStatus[] {
  return budgets.map((b) => {
    const spent = spentByCategory.get(b.category_id) ?? 0;
    const ratio = b.amount > 0 ? spent / b.amount : 0;
    return {
      categoryId: b.category_id,
      limit: b.amount,
      spent,
      ratio,
      over: spent > b.amount,
      near: ratio >= NEAR_THRESHOLD && spent <= b.amount,
    };
  });
}

// ---- Recurring materialisation ----

/** The occurrence dates for a rule in (afterISO, throughISO]. */
export function occurrencesBetween(
  rule: {
    frequency: Recurring["frequency"];
    start_date: string;
    day_of_month: number | null;
    day_of_week: number | null;
  },
  afterISO: string | null,
  throughISO: string,
): string[] {
  const out: string[] = [];
  // Never before the rule's start, never at/before what we've already run.
  let cursor = rule.start_date;
  if (afterISO && afterISO >= cursor) cursor = addDays(afterISO, 1);
  if (cursor > throughISO) return out;

  if (rule.frequency === "DAILY") {
    for (let d = cursor; d <= throughISO; d = addDays(d, 1)) out.push(d);
    return out;
  }

  if (rule.frequency === "WEEKLY") {
    const target = rule.day_of_week ?? 0;
    for (let d = cursor; d <= throughISO; d = addDays(d, 1)) {
      if (new Date(`${d}T00:00:00`).getDay() === target) out.push(d);
    }
    return out;
  }

  // MONTHLY: the Nth day of each month from the cursor's month onward, clamped
  // to that month's length so "31" still fires in February.
  const target = rule.day_of_month ?? 1;
  let month = cursor.slice(0, 7) + "-01";
  while (month <= throughISO) {
    const day = Math.min(target, daysInMonth(month));
    const occ = dayInMonth(month, day);
    if (occ >= cursor && occ <= throughISO) out.push(occ);
    month = addMonths(month, 1);
  }
  return out;
}

/**
 * Mutating: turn every due occurrence into a real Transaction and advance
 * `last_run`. Returns how many were created. Safe to call on every app open —
 * occurrences already past `last_run` are never re-created.
 *
 * `push` is injected so this stays independent of store internals; the store's
 * `runRecurring` wrapper supplies it.
 */
export function materialiseRecurring(
  recurring: Recurring[],
  today: string,
  push: (tx: {
    date: string;
    kind: TxKind;
    amount: number;
    account_id: number;
    category_id: number;
    item: string;
    note: string | null;
  }) => void,
): number {
  let created = 0;
  for (const r of recurring) {
    if (!r.active) continue;
    const dates = occurrencesBetween(r, r.last_run, today);
    for (const date of dates) {
      push({
        date,
        kind: r.kind,
        amount: r.amount,
        account_id: r.account_id,
        category_id: r.category_id,
        item: r.item,
        note: r.note,
      });
      created++;
    }
    // Advance even with zero occurrences, so the window never re-scans old dates.
    if (r.last_run === null || today > r.last_run) r.last_run = today;
  }
  return created;
}

export { todayISO };
