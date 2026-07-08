# Glasses — project guide

Single-user, local-first **Android app** (`com.glasses.app`): schedule/timetable,
attendance tracker, learning tracker, and a narrowly-scoped AI analyser.
No accounts, no cloud sync, dark mode only, offline apart from the AI calls.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS v3, built as a **static
  export** (`output: "export"` → `out/`) and wrapped with **Capacitor** into a
  native Android project (`android/`). There is **no server** — everything runs
  client-side inside the WebView.
- **On-device data**: the whole dataset is one JSON document held in memory and
  persisted with **Capacitor Preferences** (localStorage in the browser,
  native storage on Android). No SQLite.
  - `lib/store.ts` — DB shape, first-run seed, selectors, and all mutation
    functions (pure `(draft, args) => void`). `normalizeDB` migrates old shapes.
  - `lib/persist.ts` — load/save via Preferences.
  - `components/DataProvider.tsx` — React context; `useData()` returns
    `{ db, ready, mutate, reset }`.
- **AI: Google Gemini**, model `gemini-3.5-flash` (free tier, multimodal, JSON
  schema output + function calling). Calls go straight from the device to
  `generativelanguage.googleapis.com` using the user's own key (`lib/apiKey.ts`,
  stored in Preferences). Never hardcode a key, never add a server.
  `CapacitorHttp` is enabled in `capacitor.config.ts` so native fetch bypasses
  WebView CORS. `@google/genai` is lazy-imported in `lib/ai/gemini.ts` (its web
  build has no `node:` imports, so no webpack shim is needed).

## Layout
- `lib/types.ts` — domain types. `CourseType` is `LECTURE | TUTORIAL | PRACTICAL`
  (the old `LAB` migrates to `PRACTICAL`). `lib/time.ts` — local date/time
  helpers (dates `YYYY-MM-DD`, times `HH:MM`, day_of_week 0=Sun..6=Sat).
- `lib/schedule.ts` — `renderDays(db, dates)`: TimetableSlot + DateOverride +
  ClassInstance → the concrete classes per date. Single source of truth.
- `lib/attendance.ts` — `computeCourseAttendance`: per-course held/attended/%,
  `maxMoreSkippable`, `recoverCount`. Formulas are fixed (see Permanent rules).
- `lib/ai/gemini.ts` — the ONLY module that talks to a model: `generateJson`,
  `generateText`, `callFunction`. `lib/ai/scheduleCommand.ts`,
  `lib/ai/insights.ts`, `lib/timetableImport.ts` are the four callers.
  All model output is validated before it reaches the store.
- Routes → screens (pages are thin; screens are client components reading
  `useData()`): `/` → `CalendarScreen`, `/attendance` → `AttendanceScreen`,
  `/learning` → `LearningScreen`, `/setup` → `SetupScreen`.
- `components/BottomNav.tsx` — fixed bottom tab bar (primary navigation):
  Calendar · Attendance · Learning · Setup.

## Build / run
- `npm run dev` — browser preview (data in localStorage).
- `npm run cap:sync` — `next build` then `cap sync android`.
- `npm run cap:open` — open in Android Studio (Run ▶ builds/installs).
- CLI APK: JDK 17+ and Gradle 8.7 (wrapper pinned); Android Studio's bundled JBR
  works. Debug APK → `android/app/build/outputs/apk/debug/`.
- Icons: edit `scripts/make-assets.mjs`, then
  `node scripts/make-assets.mjs && npx capacitor-assets generate --android`.

## Permanent rules
- Stack is Next.js (static export) + Capacitor + Tailwind, data via the on-device
  store. Don't add a server, a second framework, or a second datastore without
  asking.
- **Git: every commit is pushed to `origin` (github.com/Specter842/Glasses).
  Never add Claude as a co-author or `Co-Authored-By` trailer.**
- Deterministic actions (clear/duplicate schedule, task CRUD, course + resource
  status, replace/delete timetable) call store functions directly and never route
  through the LLM. The model is used for exactly four things (Phase 4):
  1. **Timetable image import** (Setup) → vision + JSON schema returns *candidate*
     classes; the user confirms them on a review screen; only then does the
     deterministic `replaceTimetable` store function run.
  2. **NL schedule commands** (Calendar) → function calling into the same
     `clearSchedule` / `duplicateDay` store functions. Arguments are validated
     (strict `YYYY-MM-DD`, day-of-week 0–6) before execution; both are undoable
     via "Reset day".
  3. **"How many can I still miss"** (Attendance) → explains the per-course
     safety-margin numbers from `lib/attendance.ts`. It is told, in the system
     instruction, never to compute or invent a number.
  4. **Weekly learning summary** (Learning).
  **The schedule command box is the only chat box in the app**, and the model
  never writes to the store directly — every write goes through a store function
  after validation.
- **Attendance is per course, not a weighted overall.** A course is one timetable
  course code (so `UES101L` and `UES101P` are two courses). Each is judged against
  its own `attendance_threshold_pct` (default 75). `held` = instances with status
  ATTENDED or ABSENT; `attended` = ATTENDED; percentage = `attended / held`.
  CANCELLED instances are excluded (a cleared day and a "class cancelled" mark
  both set CANCELLED). Per-course safety-margin formulas are fixed once written.
- **Each timetable grid cell is one class period.** Two consecutive cells of the
  same course are two slots, never merged — a day's attendance denominator is
  simply the number of periods on that day.
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
