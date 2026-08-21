import { db } from '../db/schema'
import { weekKey } from './dates'
import { computeSetScore, averageScore } from './adherenceScore'
import type { CrossTrainingType, RepRange } from '../types'

export interface SetPoint {
  id: string
  date: string
  setNumber: number
  weight: number
  reps: number
  rir: number | null
  volume: number
  accuracy: number | null
  loggedAt: string
}

export interface ExerciseTrendPoint {
  date: string
  topWeight: number
  totalVolume: number
  avgReps: number
  avgRIR: number | null
  /** Average accuracy (0-100) of sets logged that day against their target reps / suggested weight; null if nothing to score against. */
  accuracy: number | null
  sets: SetPoint[]
}

/** Per-session-per-set trend for one exercise. Sets stay individually visible. */
export async function getExerciseTrend(exerciseId: string): Promise<ExerciseTrendPoint[]> {
  const sessionExercises = await db.sessionExercises.where({ exerciseId }).toArray()
  const bySessionExerciseId = new Map(sessionExercises.map((se) => [se.id, se]))
  if (sessionExercises.length === 0) return []

  const sessionIds = [...new Set(sessionExercises.map((se) => se.sessionId))]
  const sessions = await db.sessions.bulkGet(sessionIds)
  const dateBySessionId = new Map(sessions.filter(Boolean).map((s) => [s!.id, s!.date]))

  const allSets = await db.sets.where('sessionExerciseId').anyOf([...bySessionExerciseId.keys()]).toArray()

  const byDate = new Map<string, SetPoint[]>()
  for (const set of allSets) {
    const se = bySessionExerciseId.get(set.sessionExerciseId)
    if (!se) continue
    const date = dateBySessionId.get(se.sessionId)
    if (!date) continue
    const point: SetPoint = {
      id: set.id,
      date,
      setNumber: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      rir: set.rir,
      volume: set.weight * set.reps,
      accuracy: computeSetScore(set.weight, set.reps, se.targetRepRange, se.suggestedWeight),
      loggedAt: set.loggedAt,
    }
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(point)
  }

  const points: ExerciseTrendPoint[] = Array.from(byDate.entries()).map(([date, sets]) => {
    // sort chronologically (not just by setNumber, which restarts per session-exercise
    // and can collide if the same exercise was logged in two sessions the same day)
    sets.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    const totalVolume = sets.reduce((sum, s) => sum + s.volume, 0)
    const topWeight = Math.max(...sets.map((s) => s.weight))
    const avgReps = sets.reduce((sum, s) => sum + s.reps, 0) / sets.length
    const withRir = sets.filter((s) => s.rir !== null)
    const avgRIR = withRir.length ? withRir.reduce((sum, s) => sum + (s.rir ?? 0), 0) / withRir.length : null
    const accuracy = averageScore(sets.map((s) => s.accuracy))
    return { date, topWeight, totalVolume, avgReps, avgRIR, accuracy, sets }
  })

  return points.sort((a, b) => a.date.localeCompare(b.date))
}

export interface WeeklyVolumePoint {
  week: string
  byDayType: Record<string, number>
}

/** Weekly training volume (sum of weight x reps across all sets) grouped by day-type. */
export async function getWeeklyVolume(): Promise<WeeklyVolumePoint[]> {
  const sessions = await db.sessions.toArray()
  const sessionExercises = await db.sessionExercises.toArray()
  const sets = await db.sets.toArray()

  const dayTypeBySessionId = new Map(sessions.map((s) => [s.id, { dayType: s.dayTypeName, week: weekKey(s.date) }]))
  const seById = new Map(sessionExercises.map((se) => [se.id, se]))

  const weekMap = new Map<string, Record<string, number>>()
  for (const set of sets) {
    const se = seById.get(set.sessionExerciseId)
    if (!se) continue
    const meta = dayTypeBySessionId.get(se.sessionId)
    if (!meta) continue
    const volume = set.weight * set.reps
    if (!weekMap.has(meta.week)) weekMap.set(meta.week, {})
    const bucket = weekMap.get(meta.week)!
    bucket[meta.dayType] = (bucket[meta.dayType] ?? 0) + volume
  }

  return Array.from(weekMap.entries())
    .map(([week, byDayType]) => ({ week, byDayType }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

export interface WeeklyAccuracyPoint {
  week: string
  accuracy: number | null
  scoredSets: number
}

/**
 * Weekly "workout done correctly" score: every logged set is compared to
 * its target rep range and suggested weight (see lib/adherenceScore.ts),
 * then averaged across the whole week. Sets with nothing to score against
 * (no history yet, no target) are left out rather than dragging the score down.
 */
export async function getWeeklyAccuracyTrend(): Promise<WeeklyAccuracyPoint[]> {
  const sessions = await db.sessions.toArray()
  const sessionExercises = await db.sessionExercises.toArray()
  const sets = await db.sets.toArray()

  const weekBySessionId = new Map(sessions.map((s) => [s.id, weekKey(s.date)]))
  const seById = new Map(sessionExercises.map((se) => [se.id, se]))

  const weekMap = new Map<string, number[]>()
  for (const set of sets) {
    const se = seById.get(set.sessionExerciseId)
    if (!se) continue
    const week = weekBySessionId.get(se.sessionId)
    if (!week) continue
    const score = computeSetScore(set.weight, set.reps, se.targetRepRange, se.suggestedWeight)
    if (!weekMap.has(week)) weekMap.set(week, [])
    if (score !== null) weekMap.get(week)!.push(score)
  }

  return Array.from(weekMap.entries())
    .map(([week, scores]) => ({ week, accuracy: averageScore(scores), scoredSets: scores.length }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

/** "Percentage of the workout done correctly" for one finished (or in-progress) session. */
export async function getSessionAccuracy(sessionId: string): Promise<number | null> {
  const sessionExercises = await db.sessionExercises.where({ sessionId }).toArray()
  if (sessionExercises.length === 0) return null
  const seIds = sessionExercises.map((se) => se.id)
  const seById = new Map(sessionExercises.map((se) => [se.id, se]))
  const sets = await db.sets.where('sessionExerciseId').anyOf(seIds).toArray()
  const scores = sets.map((set) => {
    const se = seById.get(set.sessionExerciseId)
    return se ? computeSetScore(set.weight, set.reps, se.targetRepRange, se.suggestedWeight) : null
  })
  return averageScore(scores)
}

/** Same idea, scoped to a single exercise within a session (for a per-exercise badge while logging). */
export async function getSessionExerciseAccuracy(sessionExercise: { id: string; targetRepRange?: RepRange; suggestedWeight?: number | null }): Promise<number | null> {
  const sets = await db.sets.where({ sessionExerciseId: sessionExercise.id }).toArray()
  const scores = sets.map((set) => computeSetScore(set.weight, set.reps, sessionExercise.targetRepRange, sessionExercise.suggestedWeight))
  return averageScore(scores)
}

export interface BodyWeightPoint {
  date: string
  weightLb: number
  rollingAvg: number
}

/** Rolling 7-day average, since body weight is only logged 2-4x/week. */
export async function getBodyWeightTrend(): Promise<BodyWeightPoint[]> {
  const entries = await db.bodyWeight.orderBy('date').toArray()
  const points: BodyWeightPoint[] = []
  for (let i = 0; i < entries.length; i++) {
    const windowStart = new Date(entries[i].date)
    windowStart.setDate(windowStart.getDate() - 6)
    const windowEntries = entries.filter((e) => {
      const d = new Date(e.date)
      return d >= windowStart && d <= new Date(entries[i].date)
    })
    const rollingAvg = windowEntries.reduce((sum, e) => sum + e.weightLb, 0) / windowEntries.length
    points.push({ date: entries[i].date, weightLb: entries[i].weightLb, rollingAvg })
  }
  return points
}

export interface AdherencePoint {
  week: string
  plannedSessions: number
  completedSessions: number
  plannedExercises: number
  completedExercises: number
  skippedExercises: number
}

/** Planned vs completed, at both the session and per-exercise level. */
export async function getAdherence(): Promise<AdherencePoint[]> {
  const sessions = await db.sessions.toArray()
  const sessionExercises = await db.sessionExercises.toArray()
  const seBySessionId = new Map<string, typeof sessionExercises>()
  for (const se of sessionExercises) {
    if (!seBySessionId.has(se.sessionId)) seBySessionId.set(se.sessionId, [])
    seBySessionId.get(se.sessionId)!.push(se)
  }

  const weekMap = new Map<string, AdherencePoint>()
  for (const session of sessions) {
    const week = weekKey(session.date)
    if (!weekMap.has(week)) {
      weekMap.set(week, { week, plannedSessions: 0, completedSessions: 0, plannedExercises: 0, completedExercises: 0, skippedExercises: 0 })
    }
    const bucket = weekMap.get(week)!
    bucket.plannedSessions += 1
    if (session.status === 'completed') bucket.completedSessions += 1

    const exs = seBySessionId.get(session.id) ?? []
    bucket.plannedExercises += exs.length
    bucket.completedExercises += exs.filter((e) => e.completed).length
    bucket.skippedExercises += exs.filter((e) => e.skipped).length
  }

  return Array.from(weekMap.values()).sort((a, b) => a.week.localeCompare(b.week))
}

export interface CrossTrainingWeekPoint {
  week: string
  byType: Record<CrossTrainingType, { count: number; durationMin: number; avgHR?: number; avgPower?: number }>
}

export async function getCrossTrainingWeekly(): Promise<CrossTrainingWeekPoint[]> {
  const entries = await db.crossTraining.toArray()
  const weekMap = new Map<string, CrossTrainingWeekPoint>()

  for (const entry of entries) {
    const week = weekKey(entry.date)
    if (!weekMap.has(week)) {
      weekMap.set(week, {
        week,
        byType: {
          bike: { count: 0, durationMin: 0 },
          soccer: { count: 0, durationMin: 0 },
          volleyball: { count: 0, durationMin: 0 },
          hiking: { count: 0, durationMin: 0 },
          other: { count: 0, durationMin: 0 },
        },
      })
    }
    const bucket = weekMap.get(week)!.byType[entry.type]
    bucket.count += 1
    bucket.durationMin += entry.durationMin
    if (entry.avgHR) bucket.avgHR = ((bucket.avgHR ?? entry.avgHR) + entry.avgHR) / 2
    if (entry.avgPower) bucket.avgPower = ((bucket.avgPower ?? entry.avgPower) + entry.avgPower) / 2
  }

  return Array.from(weekMap.values()).sort((a, b) => a.week.localeCompare(b.week))
}

export interface HRSessionPoint {
  date: string
  durationMin: number
  avgHR?: number
  maxHR?: number
  avgPower?: number
}

/** Per-session HR (and, for bike, power) trend for one cross-training type. */
export async function getHRTrend(type: CrossTrainingType): Promise<HRSessionPoint[]> {
  const entries = await db.crossTraining.where('type').equals(type).sortBy('date')
  return entries.map((e) => ({ date: e.date, durationMin: e.durationMin, avgHR: e.avgHR, maxHR: e.maxHR, avgPower: e.avgPower }))
}

export interface IntensityDistribution {
  type: CrossTrainingType
  easy: number
  moderate: number
  hard: number
}

export async function getIntensityDistribution(types: CrossTrainingType[]): Promise<IntensityDistribution[]> {
  const entries = await db.crossTraining.where('type').anyOf(types).toArray()
  return types.map((type) => {
    const forType = entries.filter((e) => e.type === type)
    return {
      type,
      easy: forType.filter((e) => e.intensity === 'easy').length,
      moderate: forType.filter((e) => e.intensity === 'moderate').length,
      hard: forType.filter((e) => e.intensity === 'hard').length,
    }
  })
}

export interface WeeklyTotalVolumePoint {
  week: string
  totalVolume: number
}

export async function getWeeklyTotalGymVolume(): Promise<WeeklyTotalVolumePoint[]> {
  const weekly = await getWeeklyVolume()
  return weekly.map((w) => ({ week: w.week, totalVolume: Object.values(w.byDayType).reduce((sum, v) => sum + v, 0) }))
}

export interface SleepPoint {
  date: string
  sleepDurationHrs: number
  hrv?: number
  restingHR?: number
}

export async function getSleepTrend(): Promise<SleepPoint[]> {
  const entries = await db.sleep.orderBy('date').toArray()
  return entries.map((e) => ({
    date: e.date,
    sleepDurationHrs: Math.round((e.sleepDurationMin / 60) * 10) / 10,
    hrv: e.hrv,
    restingHR: e.restingHR,
  }))
}
