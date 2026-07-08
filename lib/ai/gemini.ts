// The one module that talks to a model. Everything else in the app is
// deterministic local computation.
//
// Calls go straight from the device to Google with the user's own key. On
// Android, CapacitorHttp patches fetch so the native request sidesteps WebView
// CORS. The SDK is loaded on demand to keep it out of the initial bundle.

/** Free-tier, multimodal, supports JSON schema output and function calling. */
export const GEMINI_MODEL = "gemini-3.5-flash";

export interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

async function createClient(apiKey: string) {
  if (!apiKey) throw new Error("Add your Gemini API key in Setup first.");
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey });
}

/** Friendlier message than the raw SDK error for the two failures users hit. */
function describe(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/API key not valid|API_KEY_INVALID|401|403/i.test(msg)) {
    return new Error("That Gemini API key was rejected. Check it in Setup.");
  }
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return new Error("Gemini rate limit hit. Wait a moment and try again.");
  }
  return new Error(msg || "The request to Gemini failed.");
}

/** Constrained JSON output against a JSON Schema. */
export async function generateJson<T>(opts: {
  apiKey: string;
  parts: Part[];
  schema: unknown;
  systemInstruction?: string;
}): Promise<T> {
  const ai = await createClient(opts.apiKey);
  let text: string | undefined;
  try {
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: opts.parts }],
      config: {
        systemInstruction: opts.systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: opts.schema,
      },
    });
    text = res.text;
  } catch (err) {
    throw describe(err);
  }
  if (!text) throw new Error("The model returned an empty response.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Could not parse the model's JSON response.");
  }
}

/** Plain prose out. Used by the two explainer features. */
export async function generateText(opts: {
  apiKey: string;
  prompt: string;
  systemInstruction?: string;
}): Promise<string> {
  const ai = await createClient(opts.apiKey);
  try {
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      config: { systemInstruction: opts.systemInstruction },
    });
    const text = res.text?.trim();
    if (!text) throw new Error("The model returned an empty response.");
    return text;
  } catch (err) {
    throw describe(err);
  }
}

/**
 * Force exactly one function call. The model chooses the function and its
 * arguments; the caller validates them and runs the real store function. The
 * model never touches the store itself.
 */
export async function callFunction(opts: {
  apiKey: string;
  prompt: string;
  systemInstruction?: string;
  functionDeclarations: {
    name: string;
    description: string;
    parametersJsonSchema: unknown;
  }[];
}): Promise<ToolCall> {
  const ai = await createClient(opts.apiKey);
  const { FunctionCallingConfigMode } = await import("@google/genai");
  try {
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      config: {
        systemInstruction: opts.systemInstruction,
        tools: [{ functionDeclarations: opts.functionDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: opts.functionDeclarations.map((f) => f.name),
          },
        },
      },
    });
    const call = res.functionCalls?.[0];
    if (!call?.name) {
      throw new Error("I couldn't turn that into a schedule action.");
    }
    return { name: call.name, args: (call.args ?? {}) as Record<string, unknown> };
  } catch (err) {
    throw describe(err);
  }
}
