import type { RepRange } from '../types'

/**
 * How closely a logged set matches what the app told you to do:
 * the suggested weight (computed from your own history + deload rules) and
 * the plan's target rep range for that exercise. Pure/deterministic so it
 * can be reused for a single set, an exercise's trend over time, a whole
 * session, or a weekly rollup — callers just choose which sets to average.
 */

/** 100 within +/-5% of suggested weight, falling linearly to 0 by +/-30% off. */
export function weightScore(actualWeight: number, suggestedWeight: number): number {
  if (suggestedWeight <= 0) return 100
  const pctOff = Math.abs(actualWeight - suggestedWeight) / suggestedWeight
  if (pctOff <= 0.05) return 100
  const score = 100 * (1 - (pctOff - 0.05) / 0.25)
  return Math.max(0, Math.min(100, Math.round(score)))
}

/** 100 for meeting or exceeding the target rep floor (more reps just means "ready to add weight next time"); scaled down below it. */
export function repScore(actualReps: number, targetRepRange: RepRange): number {
  if (targetRepRange.min <= 0) return 100
  if (actualReps >= targetRepRange.min) return 100
  return Math.max(0, Math.round((actualReps / targetRepRange.min) * 100))
}

/**
 * Combines whichever of weight/rep scoring is available for this set.
 * Returns null when there's nothing to score against (no suggested weight
 * yet and no target rep range) rather than fabricating a number.
 */
export function computeSetScore(weight: number, reps: number, targetRepRange?: RepRange, suggestedWeight?: number | null): number | null {
  const components: number[] = []
  if (suggestedWeight != null && suggestedWeight > 0) components.push(weightScore(weight, suggestedWeight))
  if (targetRepRange) components.push(repScore(reps, targetRepRange))
  if (components.length === 0) return null
  return Math.round(components.reduce((sum, c) => sum + c, 0) / components.length)
}

export function averageScore(scores: (number | null | undefined)[]): number | null {
  const valid = scores.filter((s): s is number => s != null)
  if (valid.length === 0) return null
  return Math.round(valid.reduce((sum, s) => sum + s, 0) / valid.length)
}
