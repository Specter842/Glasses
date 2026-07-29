import type { Course, ClassInstance, TimetableSlot, CourseType } from "./types";

// Per-course attendance + safety margin.
//
// A course's overall % is a *weighted average of each session type's own
// ratio*, not a simple pooled count — this matches the institution's real
// scheme: Practical carries 50% weight, Lecture and Tutorial 25% each (they
// sum to 100% when all three exist). When a course doesn't have one of the
// types, that weight is redistributed:
//   - Missing Tutorial and/or Practical: their weight moves to Lecture
//     (Lecture can reach up to 100%; Practical never exceeds its base 50%).
//   - Missing Lecture (Tutorial + Practical only): no Lecture to absorb into,
//     so the remaining two types' weights are renormalized proportionally
//     (keeping their 1:2 ratio) instead.
//   - Only one type exists at all: that type simply carries 100% weight.
// Which types a course "has" is read off its TimetableSlots (slot.type,
// falling back to course.type), not off marked instances — so the weighting
// is a fixed structural property of the timetable, unaffected by how much
// has been marked so far.
//
// For a type with `held` classes so far:
//   held      = instances with status ATTENDED or ABSENT   (CANCELLED excluded)
//   attended  = instances with status ATTENDED
//   ratio     = attended / held
// The overall pct blends each type's ratio by weight, renormalized over only
// the types that have at least one held class yet (so an untouched type
// doesn't drag the number down before it's even started) — see `usedWeight`.
//
// Safety margins (how many more of a *specific* type you can miss, or must
// attend, to hold the line) are solved per type against the overall weighted
// formula, since skipping a Lecture and skipping a Practical don't cost the
// same when their weights differ.

const BASE_WEIGHTS: Record<CourseType, number> = {
  PRACTICAL: 0.5,
  LECTURE: 0.25,
  TUTORIAL: 0.25,
};

export function courseTypesPresent(
  course: Course,
  slots: TimetableSlot[],
): Set<CourseType> {
  const types = new Set(
    slots
      .filter((s) => s.course_id === course.id)
      .map((s) => s.type ?? course.type),
  );
  if (types.size === 0) types.add(course.type);
  return types;
}

export function computeTypeWeights(
  types: Set<CourseType>,
): Partial<Record<CourseType, number>> {
  if (types.size === 0) return {};
  if (types.size === 1) {
    const only = [...types][0];
    return { [only]: 1 };
  }
  if (types.has("LECTURE")) {
    let lecture = BASE_WEIGHTS.LECTURE;
    if (!types.has("TUTORIAL")) lecture += BASE_WEIGHTS.TUTORIAL;
    if (!types.has("PRACTICAL")) lecture += BASE_WEIGHTS.PRACTICAL;
    const out: Partial<Record<CourseType, number>> = { LECTURE: lecture };
    if (types.has("TUTORIAL")) out.TUTORIAL = BASE_WEIGHTS.TUTORIAL;
    if (types.has("PRACTICAL")) out.PRACTICAL = BASE_WEIGHTS.PRACTICAL;
    return out;
  }
  // Tutorial + Practical only, no Lecture to absorb into — renormalize the
  // two proportionally to their base 1:2 ratio.
  const total = BASE_WEIGHTS.TUTORIAL + BASE_WEIGHTS.PRACTICAL;
  return {
    TUTORIAL: BASE_WEIGHTS.TUTORIAL / total,
    PRACTICAL: BASE_WEIGHTS.PRACTICAL / total,
  };
}

export interface TypeBreakdown {
  type: CourseType;
  weight: number; // 0..1
  held: number;
  attended: number;
  pct: number | null; // null until this type has any held class
  maxMoreSkippable: number | null; // null = unlimited (Infinity) or not applicable
}

export interface CourseAttendance {
  course: Course;
  held: number; // simple total across all types
  attended: number; // simple total across all types
  absent: number;
  pct: number | null; // 0..100, weighted overall — null when nothing held yet
  threshold: number; // 0..100
  meets: boolean;
  noData: boolean;
  unlimited: boolean; // threshold <= 0 → can skip freely
  maxMoreSkippable: number; // simple-model fallback margin (single-type courses only meaningful figure — see byType for the rest)
  recoverCount: number | null; // null unless currently under threshold
  recoverImpossible: boolean; // e.g. 100% threshold with an absence on record
  byType: TypeBreakdown[];
}

export function computeCourseAttendance(
  course: Course,
  instances: ClassInstance[],
  slots: TimetableSlot[],
): CourseAttendance {
  const mine = instances.filter((i) => i.course_id === course.id);
  const held = mine.filter(
    (i) => i.status === "ATTENDED" || i.status === "ABSENT",
  ).length;
  const attended = mine.filter((i) => i.status === "ATTENDED").length;
  const absent = held - attended;

  const t = course.attendance_threshold_pct / 100;
  const noData = held === 0;
  const unlimited = t <= 0;

  const types = courseTypesPresent(course, slots);
  const weights = computeTypeWeights(types);
  const typeList = Object.keys(weights) as CourseType[];

  const perType = new Map<CourseType, { held: number; attended: number }>();
  for (const ty of typeList) {
    const ofType = mine.filter((i) => (i.type ?? course.type) === ty);
    perType.set(ty, {
      held: ofType.filter((i) => i.status === "ATTENDED" || i.status === "ABSENT").length,
      attended: ofType.filter((i) => i.status === "ATTENDED").length,
    });
  }

  let usedWeight = 0;
  let weightedPct = 0;
  for (const ty of typeList) {
    const w = weights[ty]!;
    const { held: h, attended: a } = perType.get(ty)!;
    if (h > 0) {
      usedWeight += w;
      weightedPct += w * (a / h) * 100;
    }
  }
  const pct = usedWeight > 0 ? weightedPct / usedWeight : null;
  const ratio = pct === null ? null : pct / 100;
  const meets = ratio === null ? true : ratio >= t - 1e-9;

  // Per-type margins: how many more of *this* type can be missed (or must be
  // attended) while keeping the overall weighted pct at/above threshold,
  // holding every other type's current ratio fixed.
  const byType: TypeBreakdown[] = typeList.map((ty) => {
    const w = weights[ty]!;
    const { held: h, attended: a } = perType.get(ty)!;
    const typePct = h > 0 ? (a / h) * 100 : null;
    let maxMoreSkippable: number | null = null;
    if (!unlimited && h > 0) {
      // Sum of the other types' own weighted ratio contribution, holding
      // them fixed while this type's held count grows by k (more skips).
      const restWeighted = typeList
        .filter((o) => o !== ty)
        .reduce((sum, o) => {
          const { held: oh, attended: oa } = perType.get(o)!;
          return oh > 0 ? sum + weights[o]! * (oa / oh) : sum;
        }, 0);
      const rhs = t * usedWeight - restWeighted;
      if (rhs <= 1e-9) {
        // The other types alone already keep the overall pct at/above
        // threshold no matter what happens here.
        maxMoreSkippable = Infinity;
      } else {
        const k = (a * w) / rhs - h;
        maxMoreSkippable = Math.max(0, Math.floor(k + 1e-9));
      }
    }
    return { type: ty, weight: w, held: h, attended: a, pct: typePct, maxMoreSkippable };
  });

  // Single-type courses reduce to the old simple model exactly — surface
  // that on the top-level maxMoreSkippable for backwards-compatible display.
  let maxMoreSkippable = 0;
  if (unlimited) {
    maxMoreSkippable = Infinity;
  } else if (typeList.length === 1) {
    maxMoreSkippable = byType[0]?.maxMoreSkippable ?? 0;
  } else if (!noData) {
    // Multi-type courses: no single "classes" unit to skip — approximate
    // using the weighted ratio against the existing simple formula so the
    // summary line still reads sensibly.
    maxMoreSkippable = Math.max(0, Math.floor((ratio ?? 0) * held / t - held));
  }

  let recoverCount: number | null = null;
  let recoverImpossible = false;
  if (!noData && !unlimited && ratio! < t - 1e-9) {
    if (t >= 1) {
      recoverImpossible = attended < held;
      recoverCount = recoverImpossible ? null : 0;
    } else {
      recoverCount = Math.ceil((t * held - attended) / (1 - t));
    }
  }

  return {
    course,
    held,
    attended,
    absent,
    pct,
    threshold: course.attendance_threshold_pct,
    meets,
    noData,
    unlimited,
    maxMoreSkippable,
    recoverCount,
    recoverImpossible,
    byType,
  };
}
