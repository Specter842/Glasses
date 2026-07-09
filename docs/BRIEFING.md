# Glasses — Project Briefing (for AI assistants)

Paste this into a fresh Claude/AI session before working on this project. It is
the fast path to full context. `CLAUDE.md` (repo root) holds the terse permanent
rules and is auto-loaded by Claude Code; this file is the richer narrative —
architecture, history, decisions, and gotchas — meant to be sent explicitly when
starting new work. If they ever disagree, **`CLAUDE.md` + the actual code win**;
update this file to match.

---

## 1. What it is

**Glasses** (`com.glasses.app`, repo `github.com/Specter842/Glasses`, local path
`C:\Users\SirIs\OneDrive\Documents\Life`) is a single-user, local-first
**Android app** for a college student: timetable, attendance, habits, personal
finance, learning tracker, tasks. Dark mode only. **Fully offline — no accounts,
no network, no AI, and zero Android permissions.**

It began from a spec (`productivity-os-master-prompt.md`, on the user's Desktop,
not in the repo) as a local Next.js web app called "Productivity OS" and evolved
substantially past it. Treat the spec as historical; this briefing + `CLAUDE.md`
are current.

## 2. Architecture (and why)

- **Next.js** App Router + TypeScript, built as a **static export**
  (`output: "export"` → `out/`). **Tailwind CSS v3.**
- Wrapped with **Capacitor** into a native Android project in `android/`. The
  app is a static bundle inside a WebView. **There is no server** — this is the
  central constraint everything else follows from.
- **Data**: one in-memory JSON document, persisted via **Capacitor
  Preferences** (localStorage on web, native storage on device). No SQLite, no
  server actions.
  - `lib/store.ts` — the `DB` shape, `emptyDB`, `seedDB` (first-run demo data),
    `normalizeDB` (defaults missing collections so old saves still load), all
    selectors, and all mutations as pure `(draft, args) => void` functions.
  - `lib/persist.ts` — `loadDB` / `saveDB` / `resetStore` over Preferences.
  - `components/DataProvider.tsx` — React context. `useData()` returns
    `{ db, ready, mutate, reset }`. `mutate(fn)` clones the DB with
    `structuredClone`, applies one store function, persists, re-renders. It also
    runs `runRecurring` once after load, and **catches a failed load** (never
    hangs on "Loading…").
- **Screens**: routes are thin (`app/<x>/page.tsx`), each rendering a client
  screen component that reads `useData()`. Routes: `/`→CalendarScreen,
  `/attendance`→AttendanceScreen, `/habits`→HabitsScreen, `/money`→MoneyScreen,
  `/learning`→LearningScreen, `/setup`→SetupScreen.
- **Navigation**: `components/BottomNav.tsx` fixed bottom tab bar —
  Calendar · Attendance · Habits · Money · Learning. **Setup is a gear in the
  header**, not a tab (six tabs don't fit at 375px).

## 3. Feature inventory

- **Calendar** (`components/calendar/`): week/day timetable from
  `renderDays(db, dates)` in `lib/schedule.ts` (the single source of truth for
  "what's on" a date). Clear day / copy-a-weekday-onto-a-date / reset via
  `DayActions`. One-off `CalendarEvent`s via `EventComposer`, shown with a
  dashed border + EVENT tag; they never affect attendance. Tasks via
  `TaskPanel`.
- **Attendance** (`components/attendance/`): per-course marking
  (Attended/Absent/Cancelled) from a queue and inline in the day view. Math in
  `lib/attendance.ts` (`computeCourseAttendance`: held/attended/%,
  `maxMoreSkippable`, `recoverCount`). Signature arc gauge in `Gauge.tsx`.
- **Habits** (`components/habits/`): `HabitsScreen` (Today strip + tappable
  month grid, future days locked) and `TallyMarks.tsx` (SVG tally marks —
  groups of five as four uprights struck by a diagonal).
- **Money** (`components/money/`): `MoneyScreen`, `TransactionForm` (with
  `ItemSuggest` autocomplete), `ManageFinance` (accounts + categories),
  `BudgetManager`, `RecurringManager`. Pure logic in `lib/money.ts`.
- **Learning** (`components/learning/`): goals + resources, one-tap status
  cycling, progress as a plain ratio.
- **Setup** (`components/setup/`): currency, semester, courses, weekly timetable
  (manual entry), delete-timetable danger zone.

## 4. Data model (collections on `DB`, all id-keyed via `seq`)

`semester`, `courses` (`code`, `type`, per-course `attendance_threshold_pct`),
`slots` (timetable), `overrides` (CLEARED / COPY_FROM_DAY), `instances`
(materialized class occurrences with status), `events` (CalendarEvent), `tasks`,
`habits`, `habitLogs` (row exists = done that day), `accounts`, `categories`
(EXPENSE|INCOME), `transactions`, `budgets`, `recurring`, `goals`, `resources`,
`settings` (`currency`).

Dates are local `YYYY-MM-DD` strings; times `HH:MM`; `day_of_week` 0=Sun..6=Sat
(see `lib/time.ts`). `CourseType` = LECTURE | TUTORIAL | PRACTICAL (old `LAB`
migrates to PRACTICAL in `normalizeDB`).

## 5. Permanent rules (non-negotiable)

- **Deterministic only.** No model, no chat box, no network call anywhere. Every
  action goes through a store function. (The AI layer was built and then removed
  — see §7. Do not reintroduce a model/SDK/API key/INTERNET permission without
  the user asking.)
- **Attendance is per course**, not a weighted overall. `held` = ATTENDED +
  ABSENT; `%` = attended/held; CANCELLED (and cleared days) are excluded. Each
  course judged against its own threshold. Formulas in `lib/attendance.ts` are
  fixed.
- **Custom events never touch attendance.** Only the timetable feeds the
  denominator. Clearing a day cancels its classes but keeps its events.
- **Each timetable grid cell is one class period.** Consecutive same-course
  cells are two slots, never merged — a day's denominator is its period count.
- **Money is integer minor units (paise) everywhere.** Never store or add
  floats; format to a decimal only at the edge via `formatMoney`. Item
  suggestions (`suggestItems`) are category-scoped, ranked by frequency with
  recency as tie-breaker (`count + 1/(1+ageDays/14)`), prefix matches first.
- **Recurring transactions are idempotent.** `runRecurring` (called once by
  DataProvider after load) materialises occurrences only in `(last_run, today]`,
  clamps monthly days to month length (31→Feb 28), and advances `last_run` —
  reopening the app never double-charges. The date math (`occurrencesBetween`)
  is unit-tested; keep it tested if you touch it.
- **Design tokens**: strict `#000000` bg / `#FFFFFF` text; greys are
  white-over-black only (surface `#0C0C0C`, border `#242424`, secondary
  `#9A9A9A`). Only three hues + neon: royal blue `#2E5BFF`/`#5B8CFF` (primary),
  light royal green `#17C964`/`#37FF8B` (safe/≥threshold), royal red
  `#E11030`/`#FF2D55` (danger/<threshold). Instrument Sans for UI, JetBrains
  Mono for every number. Respect `prefers-reduced-motion`.
- **Git**: every commit is pushed to `origin`. **Never add a `Co-Authored-By`
  trailer or credit Claude as a contributor.**

## 6. Build & verify

- `npm run dev` — browser preview (data in localStorage).
- `npm run cap:sync` — `next build` then `cap sync android`. **Always run this
  before building the APK**, or the native app ships a stale web bundle.
- `npm run cap:open` — open in Android Studio (Run ▶).
- CLI APK: from `android/`, `JAVA_HOME=<JDK17+> ANDROID_HOME=<sdk>
  ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`.
  Android Studio's bundled JBR (JDK 21) works; Gradle wrapper is pinned to 8.7.
- Env observed: Node 22, Android SDK at
  `C:\Users\SirIs\AppData\Local\Android\Sdk`, JBR at
  `C:\Program Files\Android\Android Studio\jbr`.
- Icons: edit `scripts/make-assets.mjs`, then
  `node scripts/make-assets.mjs && npx capacitor-assets generate --android`.

## 7. Decision history (how we got here)

- Phases 1–3: calendar/timetable/tasks → attendance → learning.
- **Attendance reworked** from the spec's weighted lecture/lab "overall" to
  strictly **per-course** thresholds; "Subject" renamed to "Course".
- **Palette** switched from a muted-gold theme to the strict black/white +
  royal blue/green/red above.
- **Became an Android app via Capacitor.** Big pivot: dropped the Node server
  and `better-sqlite3`, moved to static export + on-device JSON store.
- **AI analyser (Phase 4) was built, then removed at the user's request.** It
  went Anthropic SDK → Google Gemini (`@google/genai`, `gemini-3.5-flash`, key
  stored on-device) → **fully removed**. Both SDKs uninstalled; INTERNET
  permission dropped. If AI is ever re-added: there is no server, so a key can't
  be bundled (extractable from the APK) — it'd be the user's own key on-device
  or a proxy, and **any HTTP path must be smoke-tested before declaring done**
  (a prior bug shipped an unexecuted auth path; `CapacitorHttp`'s fetch shim
  dropped the `Headers`-object API key → 403 that masqueraded as a bad key).
- **Finance** built in two passes: accounts/categories/transactions + item
  suggestions, then budgets + recurring.

## 8. Operational gotchas

- **`next build` is flaky on this Windows setup**: intermittent
  `spawn UNKNOWN` and stale-`.next` `Cannot find module for page: /_document`.
  Fix: `rm -rf .next out` and re-run. It's environmental, not a code bug.
- **Gradle silently reuses stale assets**: `BUILD SUCCESSFUL … up-to-date` can
  mean the APK didn't pick up new web code. After `cap:sync`, confirm the APK
  timestamp is fresh and that expected tasks "executed".
- **Deleting `.next` while `next dev` is running** 404s the dev chunks
  (`main-app.js`) and the app won't hydrate — restart the dev server.
- **The preview tool's screenshot tab can desync** from its eval tab; verify via
  DOM assertions (`preview_eval`) when a screenshot looks stale.
- **Line endings**: git warns LF→CRLF on commit; harmless.

## 9. Current state / how to resume

All of the above is shipped and on `origin/main`. The app builds to an
installable debug APK with zero permissions. The seed data is a demo semester
(fake courses); the user's real timetable (12 course codes, 24 periods) is
**not** entered — offer to preload it deterministically from their timetable
screenshot, or point them at manual Setup. No feature work is pending unless the
user asks. When you finish a change: `tsc --noEmit`, verify in the preview,
`cap:sync`, rebuild the APK, then commit **and push** (no co-author trailer).
