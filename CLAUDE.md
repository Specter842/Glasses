# Productivity OS — project guide

Single-user, local-first **Android app**: schedule/timetable, attendance
tracker, learning tracker, and a narrowly-scoped AI analyser. No accounts, no
cloud sync, dark mode only, fully offline.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS v3, built as a **static
  export** (`output: "export"` → `out/`) and wrapped with **Capacitor** into a
  native Android project (`android/`). There is **no server** — everything runs
  client-side inside the WebView.
- **On-device data**: the whole dataset is one JSON document held in memory and
  persisted with **Capacitor Preferences** (localStorage in the browser,
  native storage on Android). No SQLite, no network.
  - `lib/store.ts` — DB shape, first-run seed, selectors, and all mutation
    functions (pure `(draft, args) => void`).
  - `lib/persist.ts` — load/save via Preferences.
  - `components/DataProvider.tsx` — React context; `useData()` returns
    `{ db, ready, mutate, reset }`. `mutate(fn)` clones the DB, applies one
    store function, persists, and re-renders.
- AI layer (Phase 4): Anthropic Messages API using tool calling. Model
  `claude-haiku-4-5-20251001` for command parsing + the safety-margin explainer;
  `claude-sonnet-5` only if Haiku is thin on the weekly learning summary.
  ⚠️ There is no server to hold `ANTHROPIC_API_KEY`, so Phase 4 must either take
  the user's own key stored on-device, or call a small hosted proxy. Decide when
  we get there — never ship a hardcoded key.

## Layout
- `lib/types.ts` — domain types. `lib/time.ts` — local date/time helpers
  (dates `YYYY-MM-DD`, times `HH:MM`, day_of_week 0=Sun..6=Sat).
- `lib/schedule.ts` — `renderDays(db, dates)`: TimetableSlot + DateOverride +
  ClassInstance → the concrete classes per date. Single source of truth.
- `lib/attendance.ts` — `computeCourseAttendance`: per-course held/attended/%,
  `maxMoreSkippable`, `recoverCount`. Formulas are fixed (see Permanent rules).
- Routes → screens (pages are thin; screens are client components reading
  `useData()`): `/` → `CalendarScreen`, `/attendance` → `AttendanceScreen`,
  `/learning` → `LearningScreen`, `/setup` → `SetupScreen`.
- `components/BottomNav.tsx` — fixed bottom tab bar (the primary navigation,
  YouTube/Instagram style): Calendar · Attendance · Learning · Setup.
- Learning: a goal holds resources (url, title, status, one-line note). Progress
  is a **plain ratio** (`3/7 resources done`) — never a percentage bar. No tags,
  no folders: friction is the enemy here.

## Build / run
- `npm run dev` — browser preview (data in localStorage).
- `npm run cap:sync` — `next build` then `cap sync android`.
- `npm run cap:open` — open the project in Android Studio (Run ▶ builds/installs).
- CLI APK: needs JDK 17+ and Gradle 8.7 (wrapper already pinned); Android
  Studio's bundled JBR works. Debug APK → `android/app/build/outputs/apk/debug/`.

## Permanent rules
- Stack is Next.js (static export) + Capacitor + Tailwind, data via the on-device
  store. Don't add a server, a second framework, or a second datastore without
  asking.
- Deterministic actions (clear/duplicate schedule, task CRUD, course + resource
  status) call store functions directly and never route through the LLM. Only
  the three Phase 4 features use the model: (1) NL schedule commands → tool
  calling into the same `clearSchedule` / `duplicateDay` store functions;
  (2) "how many can I still miss" → explains the per-course safety-margin
  numbers, doesn't recompute them; (3) a weekly learning summary. Nothing else
  gets a chat box.
- **Attendance is per course, not a weighted overall.** Each course is judged
  against its own `attendance_threshold_pct` (default 75). For a course:
  `held` = instances with status ATTENDED or ABSENT; `attended` = ATTENDED;
  percentage = `attended / held`. CANCELLED instances are excluded (a cleared
  day and a "class cancelled" mark both set CANCELLED). Per-course safety-margin
  formulas are fixed once written.
- When marking attendance, the options are **Attended / Absent / Class
  cancelled** — cancelled removes the class from the denominator.

## Design tokens
- Strict base: background `#000000`, text `#FFFFFF`. Neutrals are white-over-
  black tones only (surface `#0C0C0C`, border `#242424`, secondary `#9A9A9A`).
- Only three hues + neon shades: royal blue `#2E5BFF`/`#5B8CFF`, light royal
  green `#17C964`/`#37FF8B`, royal red `#E11030`/`#FF2D55`. Semantics:
  **blue = primary/interactive, green = safe (≥ threshold), red = danger
  (< threshold)**.
- Instrument Sans for UI, JetBrains Mono for every number. Bottom tab bar
  navigation. Respect `prefers-reduced-motion`.
