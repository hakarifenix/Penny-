# PennyTrack 💸

A free, **offline-first** personal finance app for Android and the web. Track income,
expenses, budgets, savings goals and spending habits — with **no account, no
subscription, no cloud, and no tracking**. Your data never leaves your device.

Built with React + TypeScript + Vite + Tailwind CSS and packaged for Android with
Capacitor. A debug APK is produced automatically by GitHub Actions.

---

## Features

- **Dashboard** — total balance, period income/expenses, savings, monthly budget
  usage, a spending-trend chart, expense breakdown by category, recent
  transactions, and progress toward your active savings goal. Everything is
  computed from your real stored data.
- **Transactions** — add, edit, view details, delete (with confirmation), search,
  filter by category/type/date, sort by date or amount, and load more. Amounts are
  stored as integer minor units (no floating-point drift).
- **Categories** — sensible defaults for income and expenses, plus create, rename
  and delete custom categories. Deleting a category safely reassigns its history.
- **Budgets** — monthly limits per category or overall, with progress bars that
  reflect *normal / approaching / exceeded* states. Income is excluded and periods
  are respected to avoid double counting.
- **Savings goals** — target, saved amount, optional target date, progress and
  completion. Contributions are intentionally **not** counted as expenses.
- **Insights** — income vs expenses, spending by category, daily trends, top
  categories, previous-period comparison, average daily spend, savings rate and
  budget performance. Export to **CSV**.
- **Recurring transactions** — salary, rent, subscriptions, bills and allowances.
  Due transactions are posted automatically when the app opens or resumes, guarded
  by a unique occurrence ID so they are **never duplicated**.
- **Currency & language** — MAD (default), USD, EUR, GBP. English, French and
  Arabic with proper **RTL** layout and localized number/date formatting.
- **Privacy** — optional PIN lock (salted PBKDF2 hash, retry lockout). JSON backup
  export/import (merge or replace, fully validated before writing) and a clear-all
  option. No analytics, no ads, no fake cloud sync.
- **Themes** — dark and light.

## Tech stack

| Layer      | Choice                                            |
|------------|---------------------------------------------------|
| UI         | React 18, TypeScript, Tailwind CSS 3              |
| Build      | Vite 6                                            |
| Charts     | Recharts                                          |
| Icons      | Lucide                                            |
| Storage    | IndexedDB via Dexie (versioned schema)            |
| Mobile     | Capacitor 7 (Android)                             |
| Routing    | React Router 6 (hash)                             |
| Tests      | Vitest + fake-indexeddb                           |
| CI/CD      | GitHub Actions → debug APK artifact               |

---

## Running locally (web)

```bash
npm ci          # reproducible install from the lockfile
npm run dev     # dev server at http://localhost:5173
npm run build   # typecheck + production build to dist/
npm run typecheck
npm test        # run the unit test suite
```

## Building the Android APK (GitHub Actions)

The APK is built **automatically in the cloud** — you do **not** need Node, Java,
Gradle or Android Studio on your phone (or even your computer).

1. **Open the repository on GitHub.** Push the project to a GitHub repo (the
   `main` branch).
2. **Trigger a build.**
   - Every **push to `main`** starts a build automatically, **or**
   - Go to the **Actions** tab → select **Build Android APK** → **Run workflow**
     (manual dispatch).
3. **Watch the run.** The workflow checks out the code, installs dependencies,
   runs the TypeScript checks and unit tests, builds the Vite app, syncs
   Capacitor, sets up Java 21 + the Android SDK, and compiles a debug APK with
   Gradle. Any failing step fails the run visibly.
4. **Download the APK.** When the run succeeds, open the run → **Artifacts** →
   download **`PennyTrack-Android-APK`**. It contains
   `app-debug.apk` (produced at `android/app/build/outputs/apk/debug/app-debug.apk`).
5. **Install on your phone.**
   - Copy the `.apk` to your Android phone (or download it directly from the
     artifact on the device).
   - Open the file. If Android warns about the source, allow **"Install from
     unknown sources" / "Install unknown apps"** for your browser or file manager
     when prompted.
   - Open the installed **PennyTrack** app.

> **Debug vs. release:** The workflow produces a **debug APK**, which is fine for
> personal use and testing. For a public release you should build a **signed
> release APK or Android App Bundle (AAB)** with your own signing key and publish
> it (e.g. via Google Play). A debug build is signed with a development key and is
> not intended for store distribution.

The workflow file lives at [`.github/workflows/android-build.yml`](.github/workflows/android-build.yml).

---

## Project structure

```
src/
  components/     UI primitives, layout, charts, logo, lock screen
  db/             Dexie schema, domain types, default categories, seeds
  features/       Feature modules (transactions, budgets, goals, categories,
                  recurring, settings)
  hooks/          Live-query + recurring-processor hooks
  i18n/           English, French, Arabic dictionaries + helpers
  lib/            Money, dates, analytics, icons, PIN, download helpers
  pages/          Home, Transactions, Budgets, Insights, Settings
  services/       Data-access + business logic (transactions, budgets, goals,
                  recurring, categories, backup, CSV, demo)
  state/          Settings, toast and PIN-lock context providers
  test/           Vitest setup
android/          Capacitor-generated Android project (Gradle)
assets/           Source icon used to generate Android icons/splash
.github/workflows Android APK build pipeline
```

Business logic is kept separate from UI components and is covered by unit tests.

## Data & privacy

- All financial data is stored **locally** in IndexedDB (Dexie) and persists
  across app restarts and device reboots.
- **No network transmission** of your records, no analytics/advertising SDKs, and
  no logging of sensitive data.
- **Backups** are plain JSON you export yourself. Importing validates the file
  first and lets you **merge** or **replace**; a malformed file never wipes your
  data.
- The **PIN lock** guards app access with a salted hash. It does **not** encrypt
  the database — treat it as a privacy guard, not strong encryption.

## Notes

- Changing the **currency only changes the displayed unit** — it does not convert
  existing amounts (there is no exchange-rate feature, by design).
- Minimum Android version is **API 23 (Android 6.0)**; target/compile SDK is 35.
- The app id is `com.pennytrack.app` and the app name is **PennyTrack**.

## License

MIT — free to use, modify and share.
