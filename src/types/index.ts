// Core domain types for the athletic development tracker.
// Manual entry and future external sync share these shapes; `source` on
// cross-training/body-weight rows is what lets an ingestion path be added
// later without touching the manual-entry code.

export type ExerciseCategory = 'upper' | 'lower' | 'mobility' | 'core'

export interface RepRange {
  min: number
  max: number
}

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  videoUrl?: string
  targetRepRange?: RepRange
  targetRIRRange?: RepRange
  notes?: string
  archived: boolean
  createdAt: string
}

/** A prescribed exercise inside a reusable day template (e.g. "Upper A"). */
export interface DayTemplateExercise {
  id: string
  exerciseId: string
  order: number
  targetSets: number
  targetRepRange?: RepRange
  targetRIRRange?: RepRange
  focus?: string
}

export interface DayTemplate {
  id: string
  name: string
  block?: string
  exercises: DayTemplateExercise[]
  archived: boolean
}

export type SessionStatus = 'planned' | 'in_progress' | 'completed'

export interface WorkoutSession {
  id: string
  date: string // yyyy-MM-dd
  dayTemplateId?: string
  dayTypeName: string
  status: SessionStatus
  notes?: string
  createdAt: string
}

/** One exercise as it was actually performed (or skipped) within a session. */
export interface SessionExercise {
  id: string
  sessionId: string
  exerciseId: string
  order: number
  completed: boolean
  skipped: boolean
}

export type WeightUnit = 'lb' | 'kg'

/** A single independent working set. Never collapse these into an average. */
export interface SetEntry {
  id: string
  sessionExerciseId: string
  setNumber: number
  weight: number
  weightUnit: WeightUnit
  reps: number
  rir: number | null
  loggedAt: string
}

export type CrossTrainingType = 'bike' | 'soccer' | 'volleyball' | 'other'
export type Intensity = 'easy' | 'moderate' | 'hard'
export type DataSource = 'manual' | 'google_fit' | 'fitbit'

export interface CrossTrainingEntry {
  id: string
  date: string
  type: CrossTrainingType
  durationMin: number
  intensity?: Intensity
  avgHR?: number
  avgPower?: number
  notes?: string
  source: DataSource
}

export interface HealthCheckin {
  id: string
  date: string
  kneeSwelling: boolean
  ankleSwelling: boolean
  givingWay: boolean
  leftShinRating: number // 0-10
  fatigueNotes?: string
  sleepNotes?: string
}

export interface BodyWeightEntry {
  id: string
  date: string
  weightLb: number
  source: DataSource
}
