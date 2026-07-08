import { Preferences } from "@capacitor/preferences";

// The Gemini API key lives on-device only (native storage on Android,
// localStorage in the browser). There is no server, so the key is never
// transmitted anywhere except directly to Google. Never hardcode it.

const KEY = "gemini-api-key";

export async function getApiKey(): Promise<string> {
  const { value } = await Preferences.get({ key: KEY });
  return value?.trim() ?? "";
}

export async function setApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await Preferences.remove({ key: KEY });
    return;
  }
  await Preferences.set({ key: KEY, value: trimmed });
}

/** "AIzaSyC…wxyz" — enough to confirm which key is stored, never the whole thing. */
export function maskKey(key: string): string {
  if (key.length <= 12) return "•".repeat(key.length);
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}
