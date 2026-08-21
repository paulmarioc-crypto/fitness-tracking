import { db } from '../db/schema'
import type { SleepEntry } from '../types'

// Inlined rather than imported from db/queries: queries.ts imports this
// module for load suggestions, and a cycle between them would be fragile.
const today = () => new Date().toISOString().slice(0, 10)

/**
 * Turns logged sleep into a training-readiness signal.
 *
 * The plan asks you to record "sleep and overall fatigue when performance
 * unexpectedly drops" — this makes that automatic: the night before a
 * session is compared against your own trailing baseline, and poor recovery
 * holds the load back rather than letting double progression push on
 * regardless.
 *
 * Deliberately asymmetric: readiness can only ever *reduce* a suggested
 * load or withhold a planned increase. A great night's sleep never inflates
 * the suggestion beyond what the plan's double-progression rule allows,
 * because "slept well" is not evidence you can skip a rep-range step.
 */

export type ReadinessLevel = 'unknown' | 'normal' | 'compromised' | 'low'

export interface ReadinessBaseline {
  nights: number
  durationMin: number
  hrv?: number
  restingHR?: number
}

export interface ReadinessSignal {
  level: ReadinessLevel
  /** Short human-readable reasons, e.g. "Slept 5h 40m (1h 20m below your average)". */
  flags: string[]
  lastNight: SleepEntry | null
  baseline: ReadinessBaseline | null
  /** Multiplier applied to a held load. Always <= 1. */
  loadMultiplier: number
  /** True when a double-progression weight increase should be withheld. */
  blockProgression: boolean
  summary: string
}

const BASELINE_WINDOW_NIGHTS = 14
const MIN_BASELINE_NIGHTS = 3

// A night is "short" if it's under 6h outright, or an hour below your own norm.
const SHORT_SLEEP_ABSOLUTE_MIN = 6 * 60
const SHORT_SLEEP_DELTA_MIN = 60
// HRV is noisy night to night; 10% under baseline is a meaningful dip.
const HRV_DROP_RATIO = 0.9
// Resting HR rising ~5 bpm over baseline is a classic under-recovery marker.
const RHR_RISE_BPM = 5
// How much to ease a held load when recovery is clearly poor.
const LOW_READINESS_MULTIPLIER = 0.95

const UNKNOWN: ReadinessSignal = {
  level: 'unknown',
  flags: [],
  lastNight: null,
  baseline: null,
  loadMultiplier: 1,
  blockProgression: false,
  summary: 'No sleep logged yet — load suggestions use training history only.',
}

function fmtDuration(min: number) {
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

function mean(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Pure so it can be unit-reasoned about and reused from any screen.
 * `entries` may be unsorted; `onDate` is the session date (yyyy-MM-dd).
 */
export function computeReadiness(entries: SleepEntry[], onDate: string = today()): ReadinessSignal {
  const upToDate = entries.filter((e) => e.date <= onDate).sort((a, b) => a.date.localeCompare(b.date))
  if (upToDate.length === 0) return UNKNOWN

  const lastNight = upToDate[upToDate.length - 1]
  const priorNights = upToDate.slice(0, -1).slice(-BASELINE_WINDOW_NIGHTS)

  if (priorNights.length < MIN_BASELINE_NIGHTS) {
    return {
      ...UNKNOWN,
      lastNight,
      summary: `Building your sleep baseline (${priorNights.length + 1}/${MIN_BASELINE_NIGHTS + 1} nights) — not adjusting load yet.`,
    }
  }

  const hrvNights = priorNights.filter((e) => e.hrv !== undefined)
  const rhrNights = priorNights.filter((e) => e.restingHR !== undefined)

  const baseline: ReadinessBaseline = {
    nights: priorNights.length,
    durationMin: mean(priorNights.map((e) => e.sleepDurationMin)),
    hrv: hrvNights.length >= MIN_BASELINE_NIGHTS ? mean(hrvNights.map((e) => e.hrv!)) : undefined,
    restingHR: rhrNights.length >= MIN_BASELINE_NIGHTS ? mean(rhrNights.map((e) => e.restingHR!)) : undefined,
  }

  const flags: string[] = []

  const durationDelta = baseline.durationMin - lastNight.sleepDurationMin
  if (lastNight.sleepDurationMin < SHORT_SLEEP_ABSOLUTE_MIN || durationDelta >= SHORT_SLEEP_DELTA_MIN) {
    flags.push(
      durationDelta >= SHORT_SLEEP_DELTA_MIN
        ? `Slept ${fmtDuration(lastNight.sleepDurationMin)} — ${fmtDuration(Math.round(durationDelta))} below your average`
        : `Slept ${fmtDuration(lastNight.sleepDurationMin)} — under 6 hours`
    )
  }

  if (baseline.hrv !== undefined && lastNight.hrv !== undefined && lastNight.hrv < baseline.hrv * HRV_DROP_RATIO) {
    flags.push(`HRV ${lastNight.hrv} vs ${Math.round(baseline.hrv)} baseline`)
  }

  if (baseline.restingHR !== undefined && lastNight.restingHR !== undefined && lastNight.restingHR > baseline.restingHR + RHR_RISE_BPM) {
    flags.push(`Resting HR ${lastNight.restingHR} vs ${Math.round(baseline.restingHR)} baseline`)
  }

  const level: ReadinessLevel = flags.length === 0 ? 'normal' : flags.length === 1 ? 'compromised' : 'low'

  const summary =
    level === 'normal'
      ? 'Recovery looks normal — progressing as planned.'
      : level === 'compromised'
        ? 'Recovery is slightly down — holding load steady instead of adding weight.'
        : 'Recovery is clearly down — easing load and holding off on progression.'

  return {
    level,
    flags,
    lastNight,
    baseline,
    loadMultiplier: level === 'low' ? LOW_READINESS_MULTIPLIER : 1,
    blockProgression: level === 'compromised' || level === 'low',
    summary,
  }
}

export async function getReadiness(onDate: string = today()): Promise<ReadinessSignal> {
  const entries = await db.sleep.toArray()
  return computeReadiness(entries, onDate)
}
