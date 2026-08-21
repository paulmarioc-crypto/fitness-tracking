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
  instructions?: string
  targetRepRange?: RepRange
  targetRIRRange?: RepRange
  notes?: string
  archived: boolean
  createdAt: string
}

/** Locally-uploaded demonstration media for an exercise (GIF/image/video), one per exercise. */
export interface ExerciseMedia {
  exerciseId: string
  blob: Blob
  mediaType: 'image' | 'video'
  fileName: string
  updatedAt: string
}

/** A prescribed exercise inside a reusable day template (e.g. "Upper A"). */
export interface DayTemplateExercise {
  id: string
  exerciseId: string
  order: number
  targetSets: number
  targetRepRange?: RepRange
  targetRIRRange?: RepRange
  /** Raw "sets x reps" text from the program (e.g. "3 x 8 / leg, 3-sec lowering") for display fidelity. */
  prescriptionLabel?: string
  focus?: string
}

/** dayType identifies the recurring slot (e.g. "Upper A") across blocks; block is which 4-week block this variant belongs to. */
export interface DayTemplate {
  id: string
  name: string
  dayType: string
  block: number
  blockLabel: string
  exercises: DayTemplateExercise[]
  archived: boolean
}

/** Program calendar: when Block 1 / Week 1 begins, used to resolve the current block and deload weeks. */
export interface ProgramSettings {
  id: 'singleton'
  startDate: string | null // yyyy-MM-dd
}

export type SessionStatus = 'planned' | 'in_progress' | 'completed'

export interface WorkoutSession {
  id: string
  date: string // yyyy-MM-dd
  dayTemplateId?: string
  dayTypeName: string
  status: SessionStatus
  isDeloadWeek?: boolean
  notes?: string
  createdAt: string
}

/**
 * One exercise as it was actually performed (or skipped) within a session.
 * Target sets/reps/RIR are snapshotted from the day template at session
 * start (or from the exercise's own defaults for a freely-added exercise)
 * so they stay correct even if the template is edited later.
 */
export interface SessionExercise {
  id: string
  sessionId: string
  exerciseId: string
  order: number
  completed: boolean
  skipped: boolean
  targetSets?: number
  targetRepRange?: RepRange
  targetRIRRange?: RepRange
  prescriptionLabel?: string
  /** Suggested weight at the moment this exercise was added to the session — a stable snapshot for scoring accuracy later, even if later sessions change the suggestion. */
  suggestedWeight?: number | null
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

export type CrossTrainingType = 'bike' | 'soccer' | 'volleyball' | 'hiking' | 'other'
export type Intensity = 'easy' | 'moderate' | 'hard'
export type DataSource = 'manual' | 'google_fit' | 'fitbit'

export interface CrossTrainingEntry {
  id: string
  date: string
  type: CrossTrainingType
  durationMin: number
  intensity?: Intensity
  avgHR?: number
  maxHR?: number
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

/** Simple manually-entered sleep summary, as read off a wearable (e.g. Fitbit). */
export interface SleepEntry {
  id: string
  date: string // the morning this sleep is attributed to
  sleepDurationMin: number
  hrv?: number // ms
  restingHR?: number // bpm
  notes?: string
  source: DataSource
}
