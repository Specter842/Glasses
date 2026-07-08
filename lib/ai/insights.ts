import { generateText } from "./gemini";
import type { CourseAttendance } from "../attendance";
import type { LearningGoal, LearningResource } from "../types";
import { COURSE_TYPE_LABELS } from "../types";

// Phase 4, features 3 and 4.
//
// Both take numbers that were ALREADY computed deterministically and ask the
// model only to put them into plain language. The model must never do the maths
// itself — `lib/attendance.ts` owns the safety-margin formulas.

const MARGIN_SYSTEM = [
  "You explain attendance numbers that have already been calculated for the user.",
  "Use ONLY the numbers given to you. Never calculate, re-derive, estimate or invent a number —",
  "not a percentage, not a count, not a projection. If a number is not in the data, do not mention it.",
  "Be direct and concrete. Lead with what matters: courses below their threshold, then courses with no margin left.",
  "Write at most 5 short sentences total. No headings, no bullet symbols, no markdown.",
].join(" ");

/** Feature 3: "how many can I still miss" — explains, doesn't recompute. */
export async function explainMargins(
  stats: CourseAttendance[],
  apiKey: string,
): Promise<string> {
  const withData = stats.filter((s) => !s.noData);
  if (withData.length === 0) {
    throw new Error("Mark some attendance first — there's nothing to explain yet.");
  }

  const lines = withData.map((s) => {
    const bits = [
      `${s.course.name}${s.course.code ? ` (${s.course.code})` : ""}`,
      COURSE_TYPE_LABELS[s.course.type],
      `attended ${s.attended} of ${s.held} held`,
      `currently ${s.pct?.toFixed(0)}%`,
      `required ${s.threshold}%`,
    ];
    if (s.meets) {
      bits.push(
        s.unlimited
          ? "no attendance requirement"
          : `can miss ${s.maxMoreSkippable} more and stay at or above the requirement`,
      );
    } else if (s.recoverImpossible) {
      bits.push("cannot reach the requirement any more");
    } else {
      bits.push(
        `below the requirement; must attend the next ${s.recoverCount} in a row to get back to it`,
      );
    }
    return `- ${bits.join("; ")}`;
  });

  return generateText({
    apiKey,
    systemInstruction: MARGIN_SYSTEM,
    prompt: [
      "Here are my per-course attendance figures. Explain where I stand and what I can afford to miss.",
      "",
      ...lines,
    ].join("\n"),
  });
}

const LEARNING_SYSTEM = [
  "You summarise a student's learning progress in plain language.",
  "Use only the goals and resources given. Do not invent resources, deadlines or advice about topics you were not told about.",
  "Say what has moved, what is stalled, and what the obvious next step is.",
  "At most 4 short sentences. No headings, no bullet symbols, no markdown.",
].join(" ");

/** Feature 4: one-command weekly learning summary. */
export async function weeklyLearningSummary(
  goals: LearningGoal[],
  resourcesFor: (goalId: number) => LearningResource[],
  apiKey: string,
): Promise<string> {
  if (goals.length === 0) {
    throw new Error("Add a learning goal first — there's nothing to summarise.");
  }

  const blocks = goals.map((g) => {
    const rs = resourcesFor(g.id);
    const done = rs.filter((r) => r.status === "DONE").length;
    const head = `- Goal "${g.title}"${g.category ? ` [${g.category}]` : ""}, status ${g.status}, ${done} of ${rs.length} resources done`;
    const items = rs.map(
      (r) => `    - ${r.title} — ${r.status}${r.note ? ` (note: ${r.note})` : ""}`,
    );
    return [head, ...items].join("\n");
  });

  return generateText({
    apiKey,
    systemInstruction: LEARNING_SYSTEM,
    prompt: [
      "Summarise my learning progress this week.",
      "",
      ...blocks,
    ].join("\n"),
  });
}
