"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type DB, emptyDB, runRecurring } from "@/lib/store";
import { loadDB, saveDB, resetStore } from "@/lib/persist";
import { todayISO } from "@/lib/time";

interface DataContextValue {
  db: DB;
  ready: boolean;
  /** Apply a store mutation to a cloned draft, persist, and re-render. */
  mutate: (fn: (draft: DB) => void) => void;
  /** Wipe back to fresh sample data. */
  reset: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => emptyDB());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadDB()
      .then((loaded) => {
        if (!active) return;
        // Catch up any recurring transactions due since the app was last open.
        // Idempotent, so running on every launch is safe.
        const created = runRecurring(loaded, todayISO());
        if (created > 0) void saveDB(loaded);
        setDb(loaded);
        setReady(true);
      })
      .catch((err) => {
        // Never leave the app on a spinner. Surface the failure and come up
        // with an empty store rather than hanging on "Loading…" forever.
        console.error("loadDB failed", err);
        if (active) {
          setDb(emptyDB());
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const mutate = useCallback((fn: (draft: DB) => void) => {
    setDb((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      void saveDB(draft);
      return draft;
    });
  }, []);

  const reset = useCallback(() => {
    void resetStore().then((fresh) => setDb(fresh));
  }, []);

  return (
    <DataContext.Provider value={{ db, ready, mutate, reset }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
