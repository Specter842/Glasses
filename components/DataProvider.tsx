"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type DB, emptyDB, runRecurring, purgeOldDoneTasks } from "@/lib/store";
import { loadDB, saveDB, resetStore } from "@/lib/persist";
import { todayISO } from "@/lib/time";
import { syncNotifications } from "@/lib/notifications";

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
        // Daily housekeeping on open, both idempotent:
        // • post any recurring transactions due since last open
        // • drop tasks completed on a previous day
        const today = todayISO();
        const changed =
          runRecurring(loaded, today) + purgeOldDoneTasks(loaded, today);
        if (changed > 0) void saveDB(loaded);
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

  // structuredClone gives every mutate() call fresh references even when
  // nothing relevant changed, so key the notification resync off the actual
  // fields that feed it (tasks, events, and everything renderDays uses for
  // classes) rather than re-running — and re-touching the native plugin —
  // on every unrelated edit elsewhere in the app.
  const notifySignature = useMemo(() => {
    const taskSig = db.tasks
      .map((t) => `${t.id}:${t.done}:${t.due_date}:${t.created_at}`)
      .join(",");
    const eventSig = db.events
      .map((e) => `${e.id}:${e.date}:${e.start_time}`)
      .join(",");
    const slotSig = db.slots
      .map((s) => `${s.id}:${s.day_of_week}:${s.start_time}:${s.course_id}`)
      .join(",");
    const overrideSig = db.overrides
      .map((o) => `${o.date}:${o.kind}:${o.source_day_of_week}`)
      .join(",");
    const instanceSig = db.instances
      .map((i) => `${i.id}:${i.date}:${i.start_time}:${i.status}:${i.course_id}`)
      .join(",");
    return [taskSig, eventSig, slotSig, overrideSig, instanceSig, db.semester?.id]
      .join("|");
  }, [db.tasks, db.events, db.slots, db.overrides, db.instances, db.semester]);

  useEffect(() => {
    if (!ready) return;
    void syncNotifications(db);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, notifySignature]);

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
