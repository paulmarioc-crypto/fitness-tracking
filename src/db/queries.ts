import { db } from './schema'
import { getLoadSuggestion } from '../lib/progression'
import { deloadAdjustedSets } from '../lib/program'
import type {
  Exercise,
  DayTemplate,
  WorkoutSession,
  SessionExercise,
  SetEntry,
  CrossTrainingEntry,
  HealthCheckin,
  BodyWeightEntry,
  SleepEntry,
  WeightUnit,
} from '../types'

const uid = () => crypto.randomUUID()
export const todayStr = () => new Date().toISOString().slice(0, 10)

// ---- Exercises ----
export async function addExercise(data: Omit<Exercise, 'id' | 'createdAt' | 'archived'>) {
  const ex: Exercise = { ...data, id: uid(), archived: false, createdAt: new Date().toISOString() }
  await db.exercises.add(ex)
  return ex
}

export async function updateExercise(id: string, changes: Partial<Exercise>) {
  await db.exercises.update(id, changes)
}

export async function archiveExercise(id: string) {
  await db.exercises.update(id, { archived: true })
}

// ---- Sessions ----
/**
 * isDeloadWeek trims each exercise's target sets by ~25-30% (per the plan's
 * Week 4/8/12 rule) at session-start time, so the reduced target is baked
 * into what gets shown/logged rather than needing to be recomputed later.
 */
export async function startSession(dayTemplate: DayTemplate | null, dayTypeName: string, date = todayStr(), isDeloadWeek = false) {
  const session: WorkoutSession = {
    id: uid(),
    date,
    dayTemplateId: dayTemplate?.id,
    dayTypeName,
    status: 'in_progress',
    isDeloadWeek,
    createdAt: new Date().toISOString(),
  }
  await db.sessions.add(session)

  if (dayTemplate) {
    const sorted = dayTemplate.exercises.slice().sort((a, b) => a.order - b.order)
    const sessionExercises: SessionExercise[] = await Promise.all(
      sorted.map(async (te) => {
        const exercise = await db.exercises.get(te.exerciseId)
        const targetSets = deloadAdjustedSets(te.targetSets, isDeloadWeek)
        const suggestion = exercise
          ? await getLoadSuggestion(te.exerciseId, exercise.category, te.targetRepRange, te.targetRIRRange, targetSets, isDeloadWeek)
          : null
        return {
          id: uid(),
          sessionId: session.id,
          exerciseId: te.exerciseId,
          order: te.order,
          completed: false,
          skipped: false,
          targetSets,
          targetRepRange: te.targetRepRange,
          targetRIRRange: te.targetRIRRange,
          prescriptionLabel: te.prescriptionLabel,
          suggestedWeight: suggestion?.suggestedWeight ?? null,
        }
      })
    )
    await db.sessionExercises.bulkAdd(sessionExercises)
  }

  return session
}

export async function addSessionExercise(sessionId: string, exerciseId: string) {
  const existing = await db.sessionExercises.where({ sessionId }).toArray()
  const exercise = await db.exercises.get(exerciseId)
  const targetSets = 3
  const suggestion = exercise
    ? await getLoadSuggestion(exerciseId, exercise.category, exercise.targetRepRange, exercise.targetRIRRange, targetSets, false)
    : null
  const se: SessionExercise = {
    id: uid(),
    sessionId,
    exerciseId,
    order: existing.length,
    completed: false,
    skipped: false,
    targetSets,
    targetRepRange: exercise?.targetRepRange,
    targetRIRRange: exercise?.targetRIRRange,
    suggestedWeight: suggestion?.suggestedWeight ?? null,
  }
  await db.sessionExercises.add(se)
  return se
}

export async function setSessionExerciseStatus(id: string, changes: Partial<Pick<SessionExercise, 'completed' | 'skipped'>>) {
  await db.sessionExercises.update(id, changes)
}

export async function completeSession(id: string) {
  await db.sessions.update(id, { status: 'completed' })
}

// ---- Sets: independent, editable per-set, never averaged ----
export async function addSet(sessionExerciseId: string, weight: number, reps: number, rir: number | null, weightUnit: WeightUnit = 'lb') {
  const existing = await db.sets.where({ sessionExerciseId }).toArray()
  const set: SetEntry = {
    id: uid(),
    sessionExerciseId,
    setNumber: existing.length + 1,
    weight,
    weightUnit,
    reps,
    rir,
    loggedAt: new Date().toISOString(),
  }
  await db.sets.add(set)
  await db.sessionExercises.update(sessionExerciseId, { completed: true })
  return set
}

export async function updateSet(id: string, changes: Partial<Pick<SetEntry, 'weight' | 'reps' | 'rir' | 'weightUnit'>>) {
  await db.sets.update(id, changes)
}

export async function deleteSet(id: string) {
  const set = await db.sets.get(id)
  if (!set) return
  await db.sets.delete(id)
  // renumber remaining sets for this exercise so set numbers stay contiguous
  const remaining = await db.sets.where({ sessionExerciseId: set.sessionExerciseId }).sortBy('setNumber')
  await Promise.all(remaining.map((s, idx) => db.sets.update(s.id, { setNumber: idx + 1 })))
}

// ---- Cross-training ----
export async function addCrossTraining(data: Omit<CrossTrainingEntry, 'id'>) {
  const entry: CrossTrainingEntry = { ...data, id: uid() }
  await db.crossTraining.add(entry)
  return entry
}

export async function updateCrossTraining(id: string, changes: Partial<CrossTrainingEntry>) {
  await db.crossTraining.update(id, changes)
}

export async function deleteCrossTraining(id: string) {
  await db.crossTraining.delete(id)
}

// ---- Health check-ins (one per day, upsert) ----
export async function upsertHealthCheckin(data: Omit<HealthCheckin, 'id'>) {
  const existing = await db.healthCheckins.where({ date: data.date }).first()
  if (existing) {
    await db.healthCheckins.update(existing.id, data)
    return { ...existing, ...data }
  }
  const entry: HealthCheckin = { ...data, id: uid() }
  await db.healthCheckins.add(entry)
  return entry
}

// ---- Body weight ----
export async function addBodyWeight(data: Omit<BodyWeightEntry, 'id'>) {
  const entry: BodyWeightEntry = { ...data, id: uid() }
  await db.bodyWeight.add(entry)
  return entry
}

export async function deleteBodyWeight(id: string) {
  await db.bodyWeight.delete(id)
}

// ---- Sleep (one per day, upsert) ----
export async function upsertSleep(data: Omit<SleepEntry, 'id'>) {
  const existing = await db.sleep.where({ date: data.date }).first()
  if (existing) {
    await db.sleep.update(existing.id, data)
    return { ...existing, ...data }
  }
  const entry: SleepEntry = { ...data, id: uid() }
  await db.sleep.add(entry)
  return entry
}

// ---- Exercise media (one uploaded GIF/image/video per exercise) ----
export async function setExerciseMedia(exerciseId: string, blob: Blob, mediaType: 'image' | 'video', fileName: string) {
  await db.exerciseMedia.put({ exerciseId, blob, mediaType, fileName, updatedAt: new Date().toISOString() })
}

export async function deleteExerciseMedia(exerciseId: string) {
  await db.exerciseMedia.delete(exerciseId)
}
