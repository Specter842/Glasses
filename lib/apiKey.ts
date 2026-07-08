import { Preferences } from "@capacitor/preferences";

// The Anthropic API key lives on-device only (native storage on Android,
// localStorage in the browser). There is no server, so the key is never
// transmitted anywhere except directly to api.anthropic.com. Never hardcode it.

const KEY = "anthropic-api-key";

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

/** "sk-ant-…abcd" — enough to confirm which key is stored, never the whole thing. */
export function maskKey(key: string): string {
  if (key.length <= 12) return "•".repeat(key.length);
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
