import { getExerciseTrend } from './analytics'
import type { ReadinessLevel, ReadinessSignal } from './readiness'
import type { RepRange, ExerciseCategory } from '../types'

export interface LoadSuggestion {
  suggestedWeight: number | null
  suggestedSets: number
  reasonLabel: string
  lastSession?: { date: string; weight: number; reps: number; rir: number | null }
  /** Set when sleep data was available, so the UI can show why a load was eased. */
  readinessLevel?: ReadinessLevel
}

// Plate/dumbbell-realistic jump sizes for a "ready to progress" bump.
const INCREMENT_BY_CATEGORY: Record<ExerciseCategory, number> = {
  upper: 5,
  lower: 10,
  mobility: 2.5,
  core: 5,
}

function roundToIncrement(weight: number, increment: number) {
  return Math.round(weight / increment) * increment
}

/**
 * Suggests today's working weight from the plan's own progression rule:
 * double progression (add reps to the top of range first, then add load
 * once every set gets there at/under the target RIR) — plus the Week
 * 4/8/12 deload rule (~15% below the last top set, sets already trimmed
 * by db/queries.startSession).
 */
export async function getLoadSuggestion(
  exerciseId: string,
  category: ExerciseCategory,
  targetRepRange: RepRange | undefined,
  targetRIRRange: RepRange | undefined,
  targetSets: number,
  isDeloadWeek: boolean,
  readiness?: ReadinessSignal
): Promise<LoadSuggestion> {
  const trend = await getExerciseTrend(exerciseId)
  if (trend.length === 0) {
    return { suggestedWeight: null, suggestedSets: targetSets, reasonLabel: 'No history yet — this session sets your baseline.' }
  }

  const last = trend[trend.length - 1]
  const topSet = last.sets.reduce((a, b) => (b.weight > a.weight ? b : a))
  const lastSession = { date: last.date, weight: topSet.weight, reps: topSet.reps, rir: topSet.rir }
  const increment = INCREMENT_BY_CATEGORY[category] ?? 5
  const step = increment >= 5 ? 2.5 : increment

  if (isDeloadWeek) {
    // Deload is already the reduction — don't stack a readiness cut on top of it.
    return {
      suggestedWeight: roundToIncrement(topSet.weight * 0.85, step),
      suggestedSets: targetSets,
      reasonLabel: `Deload week — ~15% below your last top set`,
      lastSession,
      readinessLevel: readiness?.level,
    }
  }

  const hitTop = targetRepRange ? topSet.reps >= targetRepRange.max : false
  const rirOk = targetRIRRange ? topSet.rir === null || topSet.rir <= targetRIRRange.max : true
  const earnedProgression = hitTop && rirOk

  if (earnedProgression && !readiness?.blockProgression) {
    return {
      suggestedWeight: roundToIncrement(topSet.weight + increment, step),
      suggestedSets: targetSets,
      reasonLabel: 'Hit the top of your rep range last time — try adding weight',
      lastSession,
      readinessLevel: readiness?.level,
    }
  }

  if (earnedProgression && readiness?.blockProgression) {
    return {
      suggestedWeight: topSet.weight,
      suggestedSets: targetSets,
      reasonLabel: 'Earned a weight increase, but recovery is down — repeat last weight instead',
      lastSession,
      readinessLevel: readiness.level,
    }
  }

  if (readiness?.level === 'low') {
    return {
      suggestedWeight: roundToIncrement(topSet.weight * readiness.loadMultiplier, step),
      suggestedSets: targetSets,
      reasonLabel: 'Recovery is down — slightly under your last weight',
      lastSession,
      readinessLevel: readiness.level,
    }
  }

  return {
    suggestedWeight: topSet.weight,
    suggestedSets: targetSets,
    reasonLabel: 'Same weight as last time — build toward the top of the rep range first',
    lastSession,
    readinessLevel: readiness?.level,
  }
}
