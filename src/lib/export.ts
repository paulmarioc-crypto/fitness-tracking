import { db } from '../db/schema'

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Array.from(rows.reduce((set, row) => { Object.keys(row).forEach((k) => set.add(k)); return set }, new Set<string>()))
  const escape = (v: unknown) => {
    if (v === undefined || v === null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))]
  return lines.join('\n')
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function getAllData() {
  const [exercises, dayTemplates, sessions, sessionExercises, sets, crossTraining, healthCheckins, bodyWeight, sleep] = await Promise.all([
    db.exercises.toArray(),
    db.dayTemplates.toArray(),
    db.sessions.toArray(),
    db.sessionExercises.toArray(),
    db.sets.toArray(),
    db.crossTraining.toArray(),
    db.healthCheckins.toArray(),
    db.bodyWeight.toArray(),
    db.sleep.toArray(),
  ])
  return { exercises, dayTemplates, sessions, sessionExercises, sets, crossTraining, healthCheckins, bodyWeight, sleep }
}

export async function exportAllAsJSON() {
  const data = await getAllData()
  download(`fitness-tracker-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')
}

/** One flattened row per set: date, day type, exercise, set number, weight, reps, RIR. */
export async function exportSetsAsCSV() {
  const { sessions, sessionExercises, sets, exercises } = await getAllData()
  const sessionById = new Map(sessions.map((s) => [s.id, s]))
  const seById = new Map(sessionExercises.map((se) => [se.id, se]))
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))

  const rows = sets
    .map((set) => {
      const se = seById.get(set.sessionExerciseId)
      const session = se ? sessionById.get(se.sessionId) : undefined
      const exercise = se ? exerciseById.get(se.exerciseId) : undefined
      if (!se || !session || !exercise) return null
      return {
        date: session.date,
        dayType: session.dayTypeName,
        exercise: exercise.name,
        setNumber: set.setNumber,
        weight: set.weight,
        weightUnit: set.weightUnit,
        reps: set.reps,
        rir: set.rir ?? '',
      }
    })
    .filter(Boolean) as Record<string, unknown>[]

  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  download(`workout-sets-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), 'text/csv')
}

export async function exportCrossTrainingAsCSV() {
  const { crossTraining } = await getAllData()
  const rows = crossTraining
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => ({ ...c }))
  download(`cross-training-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), 'text/csv')
}

export async function exportHealthCheckinsAsCSV() {
  const { healthCheckins } = await getAllData()
  const rows = healthCheckins
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => ({ ...c }))
  download(`health-checkins-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), 'text/csv')
}

export async function exportSleepAsCSV() {
  const { sleep } = await getAllData()
  const rows = sleep
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ ...s }))
  download(`sleep-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), 'text/csv')
}
