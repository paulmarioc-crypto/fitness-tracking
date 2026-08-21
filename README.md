# Athletic Development Tracker

A mobile-first, offline-first fitness tracker built around a 12-week strength +
cross-training plan (lifting, bike, soccer, volleyball) with knee/ankle health
monitoring, progress analytics, and a lightweight daily streak.

All data lives in the browser (IndexedDB via Dexie) — nothing is sent to a
server. Export your data any time from **More → Settings & export**.

## Stack

- React + TypeScript + Vite
- Dexie (IndexedDB) for local-first storage
- React Router
- Recharts for charts
- Tailwind CSS v4

## Getting started

```bash
npm install
npm run dev      # start local dev server
npm run build    # production build to dist/
npm run typecheck # tsc --noEmit (bundled into `build`)
```

On first load the app seeds a starter exercise library and four day
templates (Upper A/B, Lower A/B) based on Block 1 of the training plan —
edit, extend, or ignore them from the Exercises page.

## Data model (`src/types/index.ts`, `src/db/schema.ts`)

- **Exercise** — name, category, optional instructional video URL, target
  rep/RIR ranges.
- **DayTemplate** — a reusable day (e.g. "Upper A") listing target exercises.
- **WorkoutSession** → **SessionExercise** → **SetEntry** — a session logs
  which exercises were actually done (vs. skipped), and each exercise holds
  an arbitrary number of independently editable sets (weight, reps, RIR).
  Sets are never averaged or collapsed — edit set 3 without touching 1, 2, 4.
- **CrossTrainingEntry** — bike/soccer/volleyball/other: duration, intensity,
  avg BPM, max BPM, power (bike), notes. Carries a `source` field (`manual`
  today; `google_fit` / `fitbit` reserved) so an external sync can be bolted
  on later — see `src/integrations/ActivityProvider.ts` for the interface
  that keeps ingestion separate from manual entry.
- **HealthCheckin** — knee/ankle swelling, giving-way, left-shin rating
  (0–10), fatigue/sleep notes. `src/lib/healthFlags.ts` surfaces 2+
  consecutive swelling days, any giving-way episode, and a rising shin trend.
- **BodyWeightEntry** — logged a few times a week; the Progress page shows a
  rolling 7-day average.
- **SleepEntry** — one per night: duration, HRV, resting HR, notes. Manually
  entered from whatever your wearable already tracked overnight.

## Pages

- **Today** — streak, health-flag banner, one-tap session start, quick
  cross-training log, daily check-in.
- **Train** — active session logging (tap-to-expand exercise, weight/reps/RIR
  entry, inline set editing), bike/soccer/volleyball quick-log forms (with
  avg/max BPM), and a Sleep tab (duration, HRV, resting HR).
- **Exercises** — library with video embeds, add/edit/archive.
- **Progress** — per-exercise weight/reps/RIR trend, weekly volume by
  day-type, adherence (planned vs. completed vs. skipped), body-weight trend,
  sleep & recovery trend (duration, HRV, resting HR).
- **Cross-Training Analysis** (More → Cross-training analysis) — weekly
  minutes by activity, weekly gym volume, avg/max BPM (+ power for bike) per
  session for bike/soccer/volleyball, soccer/volleyball intensity mix.
- **Health Flags** (More → Health flags) — the swelling/giving-way/shin
  dashboard.
- **Settings** (More → Settings & export) — CSV/JSON export, data counts,
  reset.
