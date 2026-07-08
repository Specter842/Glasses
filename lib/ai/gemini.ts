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

/**
 * Turn an SDK failure into something honest.
 *
 * The SDK throws `ApiError` with a numeric `status`, so branch on that rather
 * than pattern-matching the message — an earlier version matched /401|403/
 * anywhere in the text and cheerfully reported "key rejected" for errors that
 * had nothing to do with the key. Duck-typed so the SDK isn't eagerly imported.
 */
function describe(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err);
  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : undefined;

  switch (status) {
    case 400:
      // Google returns 400 INVALID_ARGUMENT (not 401/403) for a malformed or
      // wrong key. A *missing* key gives 403 instead — see below.
      if (/API_KEY_INVALID|API key not valid/i.test(raw)) {
        return new Error("That Gemini API key isn't valid. Re-copy it in Setup.");
      }
      return new Error(`Gemini rejected the request (400). ${raw}`);
    case 401:
    case 403:
      // No key reached Google at all. Historically this meant a fetch shim had
      // stripped the x-goog-api-key header, not that the key was bad.
      return new Error(
        "Gemini got no valid credentials (403). The key may lack access to the " +
          "Generative Language API.",
      );
    case 404:
      return new Error(`Model "${GEMINI_MODEL}" is not available to this key (404).`);
    case 429:
      return new Error("Gemini rate limit or quota reached. Wait a minute, then retry.");
  }
  if (status && status >= 500) {
    return new Error(`Gemini is unavailable right now (${status}). Try again shortly.`);
  }
  if (/Failed to fetch|NetworkError|ERR_INTERNET|ERR_NAME_NOT_RESOLVED/i.test(raw)) {
    return new Error(
      "No network. The four AI features need internet — everything else in " +
        "Glasses works offline.",
    );
  }
  return new Error(raw || "The request to Gemini failed.");
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
