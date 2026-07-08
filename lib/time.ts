// Date/time helpers. All dates are handled as local-time "YYYY-MM-DD" strings
// to avoid timezone drift from Date.toISOString() (which is UTC).

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_NAMES_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/** Format a Date as a local YYYY-MM-DD string. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Today's local date as YYYY-MM-DD. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** 0 (Sun) .. 6 (Sat) for an ISO date string. */
export function dayOfWeek(iso: string): number {
  return fromISODate(iso).getDay();
}

/** Add n days to an ISO date, returning a new ISO date. */
export function addDays(iso: string, n: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** The Sunday that starts the week containing `iso`. */
export function startOfWeek(iso: string): string {
  const d = fromISODate(iso);
  return addDays(iso, -d.getDay());
}

/** The 7 ISO dates (Sun..Sat) of the week containing `iso`. */
export function weekDates(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** e.g. "Mon 7 Jul". */
export function formatDayLabel(iso: string): string {
  const d = fromISODate(iso);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${DAY_NAMES_SHORT[d.getDay()]} ${d.getDate()} ${month}`;
}

/** e.g. "7 July 2026". */
export function formatLongDate(iso: string): string {
  const d = fromISODate(iso);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** First day of the month containing `iso`. */
export function startOfMonth(iso: string): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Add n months. Anchors to the 1st, so it never spills into the next month. */
export function addMonths(iso: string, n: number): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

/** How many days the month containing `iso` has. */
export function daysInMonth(iso: string): number {
  const d = fromISODate(iso);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** The ISO date for `day` within the month containing `iso`. */
export function dayInMonth(iso: string, day: number): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), day));
}

/** e.g. "July 2026". */
export function formatMonthYear(iso: string): string {
  const d = fromISODate(iso);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** Convert "HH:MM" to minutes since midnight for sorting. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "14:30" -> "2:30 PM". Falls back to the raw string if unparseable. */
export function formatTime(hhmm: string): string {
  const parts = hhmm.split(":");
  if (parts.length < 2) return hhmm;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
