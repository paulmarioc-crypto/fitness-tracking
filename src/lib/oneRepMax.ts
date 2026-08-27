import { getExerciseTrend } from './analytics'

/**
 * Estimated 1RM for percentage-based prescriptions (e.g. a heavy leg lift
 * at 80%). Uses Epley — 1RM = w x (1 + reps/30) — which is well behaved in
 * the low-rep range these lifts actually live in and gets unreliable past
 * ~12 reps, so high-rep sets are ignored rather than inflating the estimate.
 *
 * RIR matters: a set left 3 reps short is evidence of a higher max than the
 * same set taken to failure, so reps-in-reserve are folded in before the
 * formula.
 */

const MAX_REPS_FOR_ESTIMATE = 12

export interface OneRepMaxEstimate {
  weight: number
  /** Which logged set produced it, for showing your work. */
  fromSet: { date: string; weight: number; reps: number; rir: number | null }
}

export function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

export function estimateFromSets(
  sets: { date: string; weight: number; reps: number; rir: number | null }[]
): OneRepMaxEstimate | null {
  let best: OneRepMaxEstimate | null = null

  for (const s of sets) {
    // Treat reps-in-reserve as reps you could have done.
    const effectiveReps = s.reps + (s.rir ?? 0)
    if (effectiveReps <= 0 || effectiveReps > MAX_REPS_FOR_ESTIMATE) continue
    const estimate = epley(s.weight, effectiveReps)
    if (!best || estimate > best.weight) {
      best = { weight: estimate, fromSet: s }
    }
  }

  return best
}

/** Best estimate across everything logged for this exercise, or null if there's nothing usable yet. */
export async function estimateOneRepMax(exerciseId: string): Promise<OneRepMaxEstimate | null> {
  const trend = await getExerciseTrend(exerciseId)
  const sets = trend.flatMap((point) =>
    point.sets.map((s) => ({ date: point.date, weight: s.weight, reps: s.reps, rir: s.rir }))
  )
  return estimateFromSets(sets)
}
