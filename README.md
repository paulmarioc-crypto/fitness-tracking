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

On first load the app seeds a full exercise library and all twelve day
templates (Upper A/B, Lower A/B × Blocks 1-3) transcribed from the training
plan's own sets/reps/focus per block — edit, extend, or ignore them from the
Exercises page.

## Program calendar & progression (`src/lib/program.ts`, `src/lib/progression.ts`)

Set a program start date in **More → Settings** (Block 1 / Week 1). From
then on:
- **Today** shows the current week/block and auto-selects that block's day
  templates when starting a session (so "Upper A" resolves to the right
  variant without you having to track which block you're in).
- **Week 4/8/12 are deload weeks** — target sets are trimmed ~25-30%
  automatically at session start, per the plan's own rule.
- Logging a session shows each exercise's **target sets/reps/RIR** from the
  plan, plus a **suggested weight** computed from your last session for that
  exercise: double progression (add weight once you hit the top of the rep
  range at target RIR, otherwise repeat the weight and build reps) on normal
  weeks, and ~15% below your last top set on deload weeks. Tap the
  suggestion to fill the weight field.

## Data model (`src/types/index.ts`, `src/db/schema.ts`)

- **Exercise** — name, category, optional YouTube URL, optional uploaded
  GIF/photo/video demo (`ExerciseMedia`, stored as a Blob), optional
  step-by-step instructions text, target rep/RIR ranges.
- **DayTemplate** — a reusable day (e.g. "Upper A") tagged with its block
  (1-3) and listing target exercises with the plan's exact sets/reps
  prescription and focus cue.
- **WorkoutSession** → **SessionExercise** → **SetEntry** — a session logs
  which exercises were actually done (vs. skipped), and each exercise holds
  an arbitrary number of independently editable sets (weight, reps, RIR).
  Sets are never averaged or collapsed — edit set 3 without touching 1, 2, 4.
  Target sets/reps/RIR are snapshotted onto the SessionExercise at session
  start (deload-adjusted if applicable) so they stay correct even if the
  template is edited later.
- **ProgramSettings** — single-row table holding the program start date used
  to compute the current week/block/deload status.
- **CrossTrainingEntry** — bike/soccer/volleyball/hiking/other: duration,
  intensity, avg BPM, max BPM, power (bike), notes. Carries a `source` field
  (`manual` today; `google_fit` / `fitbit` reserved) so an external sync can
  be bolted on later — see `src/integrations/ActivityProvider.ts` for the
  interface that keeps ingestion separate from manual entry.
- **HealthCheckin** — knee/ankle swelling, giving-way, left-shin rating
  (0–10), fatigue/sleep notes. `src/lib/healthFlags.ts` surfaces 2+
  consecutive swelling days, any giving-way episode, and a rising shin trend.
- **BodyWeightEntry** — logged a few times a week; the Progress page shows a
  rolling 7-day average.
- **SleepEntry** — one per night: duration, HRV, resting HR, notes. Manually
  entered from whatever your wearable already tracked overnight.

## Pages

- **Today** — streak, program week/block/deload banner, health-flag banner,
  one-tap session start (auto-resolved to the current block), quick
  cross-training log, daily check-in.
- **Train** — active session logging (tap-to-expand exercise, target
  sets/reps/RIR + suggested weight, inline set editing), bike/soccer/
  volleyball/hiking quick-log forms (with avg/max BPM), and a Sleep tab
  (duration, HRV, resting HR).
- **Exercises** — library with YouTube embeds, uploaded GIF/photo/video demo,
  step-by-step instructions, add/edit/archive.
- **Progress** — per-exercise weight/reps/RIR trend, weekly volume by
  day-type, adherence (planned vs. completed vs. skipped), body-weight trend,
  sleep & recovery trend (duration, HRV, resting HR).
- **Cross-Training Analysis** (More → Cross-training analysis) — weekly
  minutes by activity (bike/soccer/volleyball/hiking), weekly gym volume,
  avg/max BPM (+ power for bike) per session for bike/soccer/volleyball,
  soccer/volleyball intensity mix.
- **Health Flags** (More → Health flags) — the swelling/giving-way/shin
  dashboard.
- **Settings** (More → Settings & export) — program start date, CSV/JSON
  export, data counts, reset.
