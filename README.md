# Glasses

A single-user, local-first **Android** app for staying on top of college life:
timetable, attendance, habits, money, and learning — all in one place, fully
offline.

No accounts. No cloud. No network. No Android permissions. Everything lives on
your device.

## Features

- **Calendar** — a week/day timetable rendered from your recurring class
  schedule. Clear a day, copy one day's classes onto another, and add one-off
  events (deadlines, exams, trips) that sit alongside classes. Plus a simple
  task list.
- **Attendance** — tracked **per course**, each against its own threshold
  (default 75%). Mark each class Attended / Absent / Cancelled. A signature arc
  gauge shows, per course, how many classes you can still miss — or how many
  you must attend in a row to recover.
- **Habits** — a Today strip for quick daily ticking and a tappable month grid.
  Each month's completions are drawn as real **tally marks**.
- **Money** — a wallet manager: accounts, income/expense with categories,
  monthly totals and per-category spending. Logging an item suggests things
  you've bought before **in that category**. Monthly budgets with near/over
  warnings, and recurring transactions that post themselves.
- **Learning** — goals with attached resources, progress shown as a plain
  ratio.

## Tech

- **Next.js** (App Router, TypeScript) built as a **static export**
  (`output: "export"`), styled with **Tailwind CSS v3**.
- Wrapped with **Capacitor** into a native Android project (`android/`). The
  app is a static bundle running inside a WebView — there is no server.
- All data is one JSON document persisted with **Capacitor Preferences**
  (localStorage in the browser, native storage on device).

## Develop

```bash
npm install
npm run dev        # browser preview at http://localhost:3000 (data in localStorage)
```

## Build the Android app

```bash
npm run cap:sync   # next build (→ out/) then copies the web bundle into android/
npm run cap:open   # opens the project in Android Studio — press Run ▶
```

Or build a debug APK from the command line (needs JDK 17+ — Android Studio's
bundled JBR works — and the Android SDK):

```bash
# from android/, with JAVA_HOME pointing at a JDK 17+ and ANDROID_HOME set
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

The app icon is generated from an inline SVG:

```bash
node scripts/make-assets.mjs && npx capacitor-assets generate --android
```

## Project layout

```
app/            Next.js routes (thin pages → screen components)
components/     UI, grouped by feature (calendar, attendance, habits, money, learning, setup)
lib/            Domain logic — types, on-device store, schedule/attendance/money math
android/        Capacitor-generated native project
assets/         App icon / splash source images
CLAUDE.md       Working guide + permanent rules (read this before changing anything)
docs/BRIEFING.md  Full project briefing for resuming work
```

## Privacy

Everything is computed and stored on your device. The app requests **no Android
permissions** and makes **no network requests** — nothing ever leaves the phone.
