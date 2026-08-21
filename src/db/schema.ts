import Dexie, { type Table } from 'dexie'
import type {
  Exercise,
  DayTemplate,
  WorkoutSession,
  SessionExercise,
  SetEntry,
  CrossTrainingEntry,
  HealthCheckin,
  BodyWeightEntry,
} from '../types'

export class TrackerDB extends Dexie {
  exercises!: Table<Exercise, string>
  dayTemplates!: Table<DayTemplate, string>
  sessions!: Table<WorkoutSession, string>
  sessionExercises!: Table<SessionExercise, string>
  sets!: Table<SetEntry, string>
  crossTraining!: Table<CrossTrainingEntry, string>
  healthCheckins!: Table<HealthCheckin, string>
  bodyWeight!: Table<BodyWeightEntry, string>

  constructor() {
    super('athletic-tracker')

    this.version(1).stores({
      exercises: 'id, name, category, archived',
      dayTemplates: 'id, name, archived',
      sessions: 'id, date, dayTemplateId, status',
      sessionExercises: 'id, sessionId, exerciseId',
      sets: 'id, sessionExerciseId, setNumber',
      crossTraining: 'id, date, type, source',
      healthCheckins: 'id, date',
      bodyWeight: 'id, date, source',
    })
  }
}

export const db = new TrackerDB()
