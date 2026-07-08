// Smoke-test the Gemini path without launching the app.
//
//   read -s GEMINI_API_KEY && export GEMINI_API_KEY
//   node scripts/smoke-gemini.mjs                     # text + JSON schema
//   node scripts/smoke-gemini.mjs timetable.png       # ...and vision
//
// The key is read from the environment only. It is never written to disk, never
// committed, and never printed. Uses `read -s` above so it stays out of history.

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.error("Set GEMINI_API_KEY first. See the header of this file.");
  process.exit(1);
}

// Read the model id straight out of the app so the test can't drift from it.
const src = fs.readFileSync(path.join(process.cwd(), "lib/ai/gemini.ts"), "utf8");
const model = /GEMINI_MODEL = "([^"]+)"/.exec(src)?.[1];
if (!model) {
  console.error("Could not find GEMINI_MODEL in lib/ai/gemini.ts");
  process.exit(1);
}
console.log(`model: ${model}\n`);

const ai = new GoogleGenAI({ apiKey });

function fail(label, err) {
  const status = typeof err?.status === "number" ? err.status : "—";
  console.error(`✗ ${label}\n  status: ${status}\n  ${err?.message ?? err}\n`);
  if (status === 400 && /API_KEY_INVALID|API key not valid/i.test(String(err?.message))) {
    console.error("  → the key itself is wrong. Re-copy it from aistudio.google.com/apikey.");
  } else if (status === 403 || status === 401) {
    console.error("  → no key reached Google, or it lacks Generative Language API access.");
  } else if (status === 404) {
    console.error(`  → "${model}" isn't available to this key.`);
  }
  process.exitCode = 1;
}

// 1. Plain text — proves auth and the model id.
try {
  const r = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: "Reply with exactly: ok" }] }],
  });
  console.log(`✓ auth + model reachable — replied: ${r.text?.trim()}\n`);
} catch (err) {
  fail("auth / model", err);
  process.exit(1); // nothing else can pass
}

// 2. JSON schema output — the mechanism the timetable import relies on.
try {
  const r = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: "Return ok=true and n=3." }] }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: { ok: { type: "boolean" }, n: { type: "integer" } },
        required: ["ok", "n"],
        additionalProperties: false,
      },
    },
  });
  console.log(`✓ JSON schema output — ${JSON.stringify(JSON.parse(r.text))}\n`);
} catch (err) {
  fail("JSON schema output", err);
}

// 3. Vision — only if an image path was given.
const imagePath = process.argv[2];
if (imagePath) {
  try {
    const bytes = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    const r = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: bytes.toString("base64") } },
            { text: "How many filled class cells are in this timetable? Reply with just the integer." },
          ],
        },
      ],
    });
    console.log(`✓ vision — model counted: ${r.text?.trim()}\n`);
  } catch (err) {
    fail("vision", err);
  }
} else {
  console.log("· vision skipped (pass an image path to test it)\n");
}

if (!process.exitCode) console.log("All checks passed. The app's Gemini path should work.");
