import { LocalNotifications } from "@capacitor/local-notifications";
import type { CalendarEvent, Task } from "./types";
import { type DB, NO_DEADLINE_GRACE_HOURS } from "./store";
import { renderDays } from "./schedule";
import { todayISO, addDays } from "./time";

const TASK_KIND = "task-overdue";
const CLASS_KIND = "class-start";
const EVENT_KIND = "event-reminder";

// Class-start notification ids are derived from (course, date, time), not a
// real entity id, so they're offset into a private range that a personal
// app's db.seq (task/event ids) will never reach — guarantees no collisions
// across the three notification kinds sharing one native id space.
const CLASS_ID_BASE = 900_000_000;
const CLASS_WINDOW_DAYS = 7;
const EVENT_REMINDER_MINUTES = 10;

interface Desired {
  id: number;
  title: string;
  body: string;
  at: Date;
}

/** Deterministic small positive hash so the same class occurrence always maps
 *  to the same notification id (needed so re-syncing recognises "unchanged"
 *  instead of cancel/reschedule-churning it every time). */
function hashId(input: string, base: number): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return base + (Math.abs(h) % base);
}

/** When a task is due to flip into "overdue": local midnight the day after
 *  due_date, or created_at + the undated grace period. Mirrors isTaskOverdue
 *  in store.ts — keep the two in sync if that logic changes. */
function overdueAt(task: Task): Date | null {
  if (task.due_date !== null) {
    const d = new Date(`${task.due_date}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return d;
  }
  const created = new Date(task.created_at);
  if (Number.isNaN(created.getTime())) return null;
  return new Date(created.getTime() + NO_DEADLINE_GRACE_HOURS * 3600_000);
}

function taskDesired(tasks: Task[]): Desired[] {
  const out: Desired[] = [];
  for (const t of tasks) {
    if (t.done === 1) continue;
    const at = overdueAt(t);
    if (at && at.getTime() > Date.now()) {
      out.push({ id: t.id, title: "Task overdue", body: t.title, at });
    }
  }
  return out;
}

/** Recurring timetable classes: alert right as each one begins, for a
 *  rolling window of upcoming days (re-synced on every app open and on any
 *  schedule-affecting edit, so the window keeps advancing). */
function classDesired(db: DB): Desired[] {
  const today = todayISO();
  const dates: string[] = [];
  for (let i = 0; i < CLASS_WINDOW_DAYS; i++) dates.push(addDays(today, i));

  const out: Desired[] = [];
  for (const day of renderDays(db, dates)) {
    for (const c of day.classes) {
      if (c.status !== "SCHEDULED") continue;
      const at = new Date(`${c.date}T${c.startTime}:00`);
      if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) continue;
      out.push({
        id: hashId(`${c.courseId}:${c.date}:${c.startTime}`, CLASS_ID_BASE),
        title: c.courseName,
        body: c.location ? `Starting now · ${c.location}` : "Starting now",
        at,
      });
    }
  }
  return out;
}

/** Custom one-off calendar events: alert 10 minutes before. Events with no
 *  start time (all-day) have no moment to alert at, so they're skipped. */
function eventDesired(events: CalendarEvent[]): Desired[] {
  const out: Desired[] = [];
  for (const e of events) {
    if (!e.start_time) continue;
    const start = new Date(`${e.date}T${e.start_time}:00`);
    if (Number.isNaN(start.getTime())) continue;
    const at = new Date(start.getTime() - EVENT_REMINDER_MINUTES * 60_000);
    if (at.getTime() <= Date.now()) continue;
    out.push({
      id: e.id,
      title: e.title,
      body: `Starts at ${e.start_time}${e.note ? " · " + e.note : ""}`,
      at,
    });
  }
  return out;
}

async function ensurePermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  if (current.display === "denied") return false;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

/** Cancel anything scheduled under `kind` that's no longer desired, and
 *  (re)schedule anything new or whose target time changed. */
async function reconcile(kind: string, desired: Desired[]): Promise<void> {
  const desiredById = new Map(desired.map((d) => [d.id, d]));

  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter((n) => n.extra?.kind === kind);

  const staleIds = ours
    .filter((n) => !desiredById.has(n.id))
    .map((n) => ({ id: n.id }));
  if (staleIds.length > 0) {
    await LocalNotifications.cancel({ notifications: staleIds });
  }

  const toSchedule = desired
    .filter((d) => {
      const existing = ours.find((n) => n.id === d.id);
      return !existing || existing.schedule?.at?.getTime() !== d.at.getTime();
    })
    .map((d) => ({
      id: d.id,
      title: d.title,
      body: d.body,
      schedule: { at: d.at },
      extra: { kind },
    }));

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: toSchedule });
  }
}

/**
 * Reconcile all local notifications (overdue tasks, upcoming classes, and
 * custom event reminders) against the current DB. Idempotent and safe to
 * call on every relevant data change — each kind only cancels/reschedules
 * what actually changed.
 */
export async function syncNotifications(db: DB): Promise<void> {
  if (!(await ensurePermission())) return;
  await Promise.all([
    reconcile(TASK_KIND, taskDesired(db.tasks)),
    reconcile(CLASS_KIND, classDesired(db)),
    reconcile(EVENT_KIND, eventDesired(db.events)),
  ]);
}
