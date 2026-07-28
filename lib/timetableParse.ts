import type { OcrLine } from "./ocr";

// Turns OCR'd lines into candidate timetable rows. Deliberately scoped to
// "list format" timetables — a day header followed by one time-slot per
// line, e.g. exported/typed timetables ("Monday  9:00-10:00  Data
// Structures  R101"). Grid-format photos (days as column headers, times as
// row headers) will parse poorly since nothing here reconstructs 2D table
// structure — that's a known, accepted limitation, not a bug: the caller
// must always route this through a review/edit step before committing
// anything, never auto-commit.

export interface ParsedSlotRow {
  dayOfWeek: number | null; // null = couldn't tell, needs the user to pick one
  startTime: string | null; // HH:MM
  endTime: string | null;
  title: string;
  sourceText: string;
}

const DAY_PATTERNS: [RegExp, number][] = [
  [/\bsun(day)?\b/i, 0],
  [/\bmon(day)?\b/i, 1],
  [/\btue(s|sday)?\b/i, 2],
  [/\bwed(nesday)?\b/i, 3],
  [/\bthu(r|rs|rsday)?\b/i, 4],
  [/\bfri(day)?\b/i, 5],
  [/\bsat(urday)?\b/i, 6],
];

// Matches "9:00", "09:00", "9.00 am" etc. — OCR sometimes misreads ":" as
// "." or ";", so all three separators are accepted.
const TIME_RE = /\b(\d{1,2})[:.;](\d{2})\s*(am|pm|AM|PM)?\b/g;

function to24h(h: number, m: number, meridiem: string | undefined): string {
  let hour = h;
  if (meridiem) {
    const upper = meridiem.toUpperCase();
    if (upper === "PM" && hour < 12) hour += 12;
    if (upper === "AM" && hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function findDay(text: string): { day: number; match: string } | null {
  for (const [re, day] of DAY_PATTERNS) {
    const m = text.match(re);
    if (m) return { day, match: m[0] };
  }
  return null;
}

function extractTimes(text: string): {
  startTime: string | null;
  endTime: string | null;
  remainder: string;
} {
  const matches = [...text.matchAll(TIME_RE)];
  if (matches.length === 0) {
    return { startTime: null, endTime: null, remainder: text };
  }
  let remainder = text;
  // Strip matched time tokens (and stray separators like "-"/"to" left
  // dangling between them) from the back so earlier indices stay valid.
  for (const m of matches.slice(0, 2).reverse()) {
    const start = m.index ?? 0;
    remainder = remainder.slice(0, start) + remainder.slice(start + m[0].length);
  }
  remainder = remainder.replace(/^\s*[-–—]\s*|\bto\b/gi, " ").trim();

  const startTime = to24h(Number(matches[0][1]), Number(matches[0][2]), matches[0][3]);
  const endTime =
    matches.length > 1
      ? to24h(Number(matches[1][1]), Number(matches[1][2]), matches[1][3])
      : null;
  return { startTime, endTime, remainder };
}

export function parseTimetable(lines: OcrLine[]): ParsedSlotRow[] {
  const sorted = [...lines].sort((a, b) =>
    a.page !== b.page
      ? a.page - b.page
      : a.bbox.y0 !== b.bbox.y0
        ? a.bbox.y0 - b.bbox.y0
        : a.bbox.x0 - b.bbox.x0,
  );

  const rows: ParsedSlotRow[] = [];
  let currentDay: number | null = null;

  for (const line of sorted) {
    const text = line.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    const dayMatch = findDay(text);
    let working = text;
    if (dayMatch) {
      currentDay = dayMatch.day;
      working = working.replace(dayMatch.match, " ").trim();
    }

    const { startTime, endTime, remainder } = extractTimes(working);
    const title = remainder.replace(/^[\s:.,\-–—]+|[\s:.,\-–—]+$/g, "").trim();

    // A line that was purely a day header (nothing left after stripping the
    // day name, no time either) just updates currentDay — no row to emit.
    if (!title && !startTime) continue;
    if (!title) continue; // a bare time with no course name isn't useful

    rows.push({ dayOfWeek: currentDay, startTime, endTime, title, sourceText: text });
  }

  return rows;
}
