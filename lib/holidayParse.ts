import type { OcrLine } from "./ocr";

// Scans OCR'd text for date-like tokens and takes the rest of the line as a
// label — e.g. "26 January 2026 - Republic Day" or "15/08/2025 Independence
// Day". Much more tractable than the timetable case since a date is a fairly
// unambiguous pattern to regex for, unlike reconstructing table structure.
// Still best-effort (OCR noise, missing years, DD/MM vs MM/DD ambiguity) —
// feeds a review/edit step, never auto-commits.

export interface ParsedHolidayRow {
  date: string; // YYYY-MM-DD
  label: string;
  sourceText: string;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function monthIndex(token: string): number | null {
  const t = token.toLowerCase();
  const full = MONTH_NAMES.indexOf(t);
  if (full >= 0) return full;
  if (t.length < 3) return null;
  const abbr = MONTH_NAMES.findIndex((m) => m.startsWith(t.slice(0, 3)));
  return abbr >= 0 ? abbr : null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Clamp an OCR'd/typo'd year into something plausible, expanding 2-digit
 *  years (e.g. "26" -> 2026) relative to now rather than trusting them
 *  blindly. */
function normalizeYear(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (raw.length <= 2) return 2000 + n;
  return n;
}

interface DateMatch {
  index: number;
  length: number;
  date: string;
}

function tryNumeric(text: string, currentYear: number): DateMatch | null {
  const m = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const year = normalizeYear(m[3], currentYear);
  // Disambiguate DD/MM vs MM/DD: whichever field is >12 must be the day.
  // If both are <=12 (genuinely ambiguous), default to DD/MM.
  let day: number;
  let month: number;
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  } else if (b > 12 && a <= 12) {
    day = b;
    month = a;
  } else if (a <= 12 && b <= 12) {
    day = a;
    month = b;
  } else {
    return null; // both >12: not a valid date
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return {
    index: m.index ?? 0,
    length: m[0].length,
    date: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

function tryDayMonth(text: string, currentYear: number): DateMatch | null {
  const m = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?\s*,?\s*(\d{4}|\d{2})?\b/,
  );
  if (!m) return null;
  const month = monthIndex(m[2]);
  if (month === null) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  const year = normalizeYear(m[3], currentYear);
  return {
    index: m.index ?? 0,
    length: m[0].length,
    date: `${year}-${pad2(month + 1)}-${pad2(day)}`,
  };
}

function tryMonthDay(text: string, currentYear: number): DateMatch | null {
  const m = text.match(
    /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4}|\d{2})?\b/,
  );
  if (!m) return null;
  const month = monthIndex(m[1]);
  if (month === null) return null;
  const day = Number(m[2]);
  if (day < 1 || day > 31) return null;
  const year = normalizeYear(m[3], currentYear);
  return {
    index: m.index ?? 0,
    length: m[0].length,
    date: `${year}-${pad2(month + 1)}-${pad2(day)}`,
  };
}

export function parseHolidays(
  lines: OcrLine[],
  now: Date = new Date(),
): ParsedHolidayRow[] {
  const currentYear = now.getFullYear();
  const rows: ParsedHolidayRow[] = [];

  for (const line of lines) {
    const text = line.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    const found =
      tryNumeric(text, currentYear) ??
      tryDayMonth(text, currentYear) ??
      tryMonthDay(text, currentYear);
    if (!found) continue;

    const before = text.slice(0, found.index);
    const after = text.slice(found.index + found.length);
    const label = `${before} ${after}`
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[:.,\-–—]+\s*/, "")
      .replace(/\s*[:.,\-–—]+$/, "")
      .trim();

    rows.push({ date: found.date, label: label || "Holiday", sourceText: text });
  }

  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
