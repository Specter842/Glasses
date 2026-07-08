import { callFunction } from "./gemini";
import { DAY_NAMES, dayOfWeek, fromISODate, todayISO } from "../time";

// Phase 4, feature 2: natural-language schedule commands.
//
// The model's ONLY job is to turn free text into one of exactly two function
// calls. It never writes to the store — the caller validates the arguments and
// then runs the same deterministic `clearSchedule` / `duplicateDay` functions
// the buttons use. Both actions are reversible with "Reset day".

export type ScheduleAction =
  | { kind: "CLEAR"; date: string }
  | { kind: "DUPLICATE"; targetDate: string; sourceDayOfWeek: number };

const FUNCTIONS = [
  {
    name: "clear_schedule",
    description:
      "Cancel every class on one date. Use for 'clear today', 'cancel friday', 'no classes on 12 July'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The absolute date to clear, as YYYY-MM-DD.",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "duplicate_day",
    description:
      "Copy one weekday's recurring timetable onto a specific date. Use for 'duplicate tuesday onto this saturday', 'run monday's schedule on 15 July'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        target_date: {
          type: "string",
          description: "The absolute date to copy classes onto, as YYYY-MM-DD.",
        },
        source_day_of_week: {
          type: "integer",
          description:
            "The weekday whose timetable is copied. 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.",
        },
      },
      required: ["target_date", "source_day_of_week"],
    },
  },
];

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function systemInstruction(today: string): string {
  const dow = dayOfWeek(today);
  return [
    `Today is ${today}, a ${DAY_NAMES[dow]}.`,
    `Resolve every relative date ("today", "tomorrow", "this saturday", "next monday") to an absolute YYYY-MM-DD date.`,
    `"This <weekday>" means the nearest upcoming one, within the next 7 days.`,
    `Weekday numbers are 0=Sunday through 6=Saturday.`,
    `Call exactly one function. Never answer in prose.`,
  ].join(" ");
}

/** Parse free text into a validated, executable schedule action. */
export async function parseScheduleCommand(
  text: string,
  apiKey: string,
  today = todayISO(),
): Promise<ScheduleAction> {
  const command = text.trim();
  if (!command) throw new Error("Type a command first.");

  const call = await callFunction({
    apiKey,
    prompt: command,
    systemInstruction: systemInstruction(today),
    functionDeclarations: FUNCTIONS,
  });

  if (call.name === "clear_schedule") {
    return { kind: "CLEAR", date: requireDate(call.args.date) };
  }
  if (call.name === "duplicate_day") {
    return {
      kind: "DUPLICATE",
      targetDate: requireDate(call.args.target_date),
      sourceDayOfWeek: requireDayOfWeek(call.args.source_day_of_week),
    };
  }
  throw new Error(`Unknown action "${call.name}".`);
}

/** Never trust the model's arguments — a bad date would corrupt the calendar. */
function requireDate(value: unknown): string {
  if (typeof value !== "string" || !ISO_RE.test(value)) {
    throw new Error("I couldn't work out which date you meant.");
  }
  const d = fromISODate(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("I couldn't work out which date you meant.");
  }
  return value;
}

function requireDayOfWeek(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 6) {
    throw new Error("I couldn't work out which weekday you meant.");
  }
  return n;
}
