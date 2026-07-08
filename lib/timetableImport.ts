import type { CourseType } from "./types";
import type { ImportedClass } from "./store";
import { generateJson } from "./ai/gemini";

// Phase 4, feature 1: read a timetable screenshot into candidate class periods.
//
// This never writes. It returns candidates; the user confirms them on a review
// screen, and only then does the deterministic `replaceTimetable` store
// function run. A silently mis-read cell would corrupt the attendance maths,
// which is exactly what the review gate exists to prevent.

const MAX_EDGE = 2000; // downscale huge screenshots before upload

const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

type DayName = (typeof DAY_NAMES)[number];

interface RawClass {
  day: DayName;
  start_time: string;
  end_time: string;
  course_name: string;
  course_code: string;
  type: CourseType;
  location: string;
}

// Kept to the JSON Schema subset Gemini accepts: no additionalProperties.
const SCHEMA = {
  type: "object",
  properties: {
    classes: {
      type: "array",
      description: "Every class period on the timetable, one entry per grid cell.",
      items: {
        type: "object",
        properties: {
          day: { type: "string", enum: [...DAY_NAMES] },
          start_time: { type: "string", description: "24-hour HH:MM, e.g. 09:40." },
          end_time: {
            type: "string",
            description: "24-hour HH:MM. The start of the next time row.",
          },
          course_name: { type: "string" },
          course_code: {
            type: "string",
            description: "The course code badge, e.g. UES101T. Empty string if absent.",
          },
          type: { type: "string", enum: ["LECTURE", "TUTORIAL", "PRACTICAL"] },
          location: {
            type: "string",
            description: "Room or lab, e.g. F310. Empty string if absent.",
          },
        },
        required: [
          "day",
          "start_time",
          "end_time",
          "course_name",
          "course_code",
          "type",
          "location",
        ],
      },
    },
  },
  required: ["classes"],
};

const PROMPT = `This image is a weekly class timetable grid. Time slots run down the left column; days run across the top.

Extract EVERY class period into the \`classes\` array.

Rules:
- One entry per filled grid cell. If the same course occupies two consecutive
  time rows (a two-period lab), that is TWO entries, not one merged block.
  Never merge cells.
- \`start_time\` is that row's time label, converted to 24-hour HH:MM.
  \`end_time\` is the NEXT time row's label (the period's end). For the last row
  of the day, add the same duration as the other periods.
- \`type\` comes from the coloured badge on the cell: "Lecture", "Tutorial" or
  "Practical" -> LECTURE / TUTORIAL / PRACTICAL.
- \`course_code\` is the small code pill (e.g. UES101T, UPH013P). Copy it exactly.
- \`location\` is the room/lab line (e.g. F310, G317 LAB, W/SHOP LAB).
- Skip empty/greyed cells entirely.
- Read carefully: inventing a class or missing one is far worse than being slow.`;

/** Draw the picked image to a canvas, downscale if huge, return base64 + type. */
export async function fileToImagePayload(
  file: File,
): Promise<{ base64: string; mediaType: "image/png" | "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read the image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // PNG keeps the small text crisp; fall back to JPEG if it's over ~4MB.
  let mediaType: "image/png" | "image/jpeg" = "image/png";
  let dataUrl = canvas.toDataURL("image/png");
  if (dataUrl.length > 4_500_000) {
    mediaType = "image/jpeg";
    dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  }
  return { base64: dataUrl.split(",")[1] ?? "", mediaType };
}

export async function extractTimetable(
  file: File,
  apiKey: string,
): Promise<ImportedClass[]> {
  const { base64, mediaType } = await fileToImagePayload(file);

  const parsed = await generateJson<{ classes: RawClass[] }>({
    apiKey,
    schema: SCHEMA,
    parts: [
      { inlineData: { mimeType: mediaType, data: base64 } },
      { text: PROMPT },
    ],
  });

  if (!Array.isArray(parsed.classes)) {
    throw new Error("No timetable data came back. Try a clearer screenshot.");
  }

  return parsed.classes
    .map(toImportedClass)
    .filter((c): c is ImportedClass => c !== null);
}

const TIME_RE = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

function toImportedClass(raw: RawClass): ImportedClass | null {
  const dayOfWeek = DAY_NAMES.indexOf(raw.day);
  if (dayOfWeek < 0) return null;
  if (!TIME_RE.test(raw.start_time) || !TIME_RE.test(raw.end_time)) return null;
  if (!raw.course_name?.trim() && !raw.course_code?.trim()) return null;
  return {
    dayOfWeek,
    startTime: pad(raw.start_time),
    endTime: pad(raw.end_time),
    courseName: raw.course_name ?? "",
    courseCode: raw.course_code ?? "",
    type: raw.type,
    location: raw.location ?? "",
  };
}

function pad(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return `${h.padStart(2, "0")}:${m}`;
}
