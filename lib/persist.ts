import { Preferences } from "@capacitor/preferences";
import { type DB, seedDB, normalizeDB } from "./store";

// Persist the whole DB document under one key. Preferences maps to localStorage
// on web (dev/preview) and to native storage on Android.

const KEY = "productivity-db-v1";

export async function loadDB(): Promise<DB> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) {
    const db = seedDB();
    await saveDB(db);
    return db;
  }
  try {
    return normalizeDB(JSON.parse(value));
  } catch {
    const db = seedDB();
    await saveDB(db);
    return db;
  }
}

export async function saveDB(db: DB): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(db) });
}

/** Wipe back to fresh sample data. */
export async function resetStore(): Promise<DB> {
  const db = seedDB();
  await saveDB(db);
  return db;
}
