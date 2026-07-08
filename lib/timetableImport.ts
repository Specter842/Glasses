import type { CourseType } from "./types";
import type { ImportedClass } from "./store";

// Reads a timetable screenshot and returns the class periods on it.
//
// This is the one place a model touches the timetable, and it never writes:
// it returns candidate classes, the user confirms them on a review screen, and
// only then does the deterministic `replaceTimetable` store function run.
//
// There is no server, so the request goes straight from the device to
// api.anthropic.com with the user's own key. On Android, CapacitorHttp patches
// fetch to make the request natively, which sidesteps browser CORS.

const MODEL = "claude-opus-4-8";
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
          start_time: {
            type: "string",
            description: "24-hour HH:MM, e.g. 09:40 or 14:20.",
          },
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
            description: "Room or lab, e.g. F310 or G317 LAB. Empty string if absent.",
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
        additionalProperties: false,
      },
    },
  },
  required: ["classes"],
  additionalProperties: false,
} as const;

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
- Read carefully: it is far worse to invent a class or miss one than to be slow.`;

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
  if (!apiKey) throw new Error("Add your Anthropic API key first.");
  const { base64, mediaType } = await fileToImagePayload(file);

  // Loaded on demand so the SDK stays out of the initial bundle.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({
    apiKey,
    // Single-user on-device app: the key is the user's own and never leaves
    // the device except to Anthropic.
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to read this image.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("The timetable was too large to read in one pass.");
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("No timetable data came back. Try a clearer screenshot.");
  }

  let parsed: { classes: RawClass[] };
  try {
    parsed = JSON.parse(text.text);
  } catch {
    throw new Error("Could not parse the timetable the model returned.");
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
