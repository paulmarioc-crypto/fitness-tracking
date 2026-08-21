import { db } from './schema'
import type { Exercise, DayTemplate, ExerciseCategory, RepRange } from '../types'

const uid = () => crypto.randomUUID()

interface SeedExerciseDef {
  name: string
  category: ExerciseCategory
  focus: string
}

// Exercise catalog pulled from the 12-week athletic development plan
// (shoulders/glutes/calves/ankle-stability priorities). Users can edit,
// archive, or add to this freely from the Exercises page.
const CATALOG: SeedExerciseDef[] = [
  { name: 'Overhead press', category: 'upper', focus: 'Shoulder strength' },
  { name: 'Barbell overhead press', category: 'upper', focus: 'Heavier shoulder strength' },
  { name: 'Dumbbell shoulder press', category: 'upper', focus: 'Shoulder hypertrophy' },
  { name: 'Incline dumbbell press', category: 'upper', focus: 'Chest + anterior shoulder' },
  { name: 'Chest press', category: 'upper', focus: 'Chest maintenance/build' },
  { name: 'Bench/chest press', category: 'upper', focus: 'Chest strength' },
  { name: 'Lat pulldown', category: 'upper', focus: 'Vertical pull' },
  { name: 'Pull-up / heavier pulldown', category: 'upper', focus: 'Vertical pull strength' },
  { name: 'Chest-supported row', category: 'upper', focus: 'Back strength' },
  { name: 'One-arm cable row', category: 'upper', focus: 'Back + unilateral control' },
  { name: 'Single-arm row', category: 'upper', focus: 'Back strength' },
  { name: 'Lateral raise', category: 'upper', focus: 'Shoulder width' },
  { name: 'Cable lateral raise', category: 'upper', focus: 'Shoulder hypertrophy' },
  { name: 'Rear-delt fly', category: 'upper', focus: 'Rear delt / upper-back balance' },
  { name: 'Reverse pec deck', category: 'upper', focus: 'Rear delts' },
  { name: 'Face pull', category: 'upper', focus: 'Scapular/rear-delt work' },
  { name: 'Hip thrust', category: 'lower', focus: 'Glute strength' },
  { name: 'Bulgarian split squat', category: 'lower', focus: 'Single-leg strength' },
  { name: 'Single-leg RDL', category: 'lower', focus: 'Glute/hamstring + balance' },
  { name: 'Poliquin controlled step-down', category: 'lower', focus: 'Knee/ankle control' },
  { name: 'Spanish squat', category: 'lower', focus: 'Quadriceps/knee capacity' },
  { name: 'Hamstring curl', category: 'lower', focus: 'Hamstrings' },
  { name: 'Hip abduction', category: 'lower', focus: 'Glute medius' },
  { name: 'Standing calf raise', category: 'lower', focus: 'Gastrocnemius + calf capacity' },
  { name: 'Seated calf raise', category: 'lower', focus: 'Soleus' },
  { name: 'Tibialis raise', category: 'lower', focus: 'Anterior shin / dorsiflexion strength' },
  { name: 'Spring-ankle isometric', category: 'mobility', focus: 'Ankle stiffness/control' },
  { name: 'Single-leg balance + reach', category: 'mobility', focus: 'Dynamic balance' },
]

const RANGE_BY_FOCUS: Record<string, RepRange> = {
  'Shoulder strength': { min: 8, max: 10 },
  'Heavier shoulder strength': { min: 6, max: 8 },
  'Shoulder hypertrophy': { min: 8, max: 12 },
  'Chest + anterior shoulder': { min: 8, max: 12 },
  'Chest maintenance/build': { min: 8, max: 12 },
  'Chest strength': { min: 6, max: 10 },
  'Vertical pull': { min: 8, max: 12 },
  'Vertical pull strength': { min: 6, max: 10 },
  'Back strength': { min: 8, max: 12 },
  'Back + unilateral control': { min: 10, max: 12 },
  'Shoulder width': { min: 12, max: 20 },
  'Rear delt / upper-back balance': { min: 12, max: 20 },
  'Rear delts': { min: 12, max: 20 },
  'Scapular/rear-delt work': { min: 15, max: 20 },
  'Glute strength': { min: 8, max: 10 },
  'Single-leg strength': { min: 8, max: 8 },
  'Glute/hamstring + balance': { min: 8, max: 8 },
  'Knee/ankle control': { min: 8, max: 8 },
  'Quadriceps/knee capacity': { min: 10, max: 10 },
  Hamstrings: { min: 10, max: 15 },
  'Glute medius': { min: 15, max: 20 },
  'Gastrocnemius + calf capacity': { min: 10, max: 15 },
  Soleus: { min: 12, max: 20 },
  'Anterior shin / dorsiflexion strength': { min: 15, max: 20 },
  'Ankle stiffness/control': { min: 15, max: 20 },
  'Dynamic balance': { min: 8, max: 12 },
}

function exerciseFor(name: string, exercises: Exercise[]): Exercise {
  const ex = exercises.find((e) => e.name === name)
  if (!ex) throw new Error(`Seed exercise missing: ${name}`)
  return ex
}

// Block 1 (Weeks 1-4: "Capacity + Control") day templates, used as the
// starting default. Later blocks progress load/tempo — logged per-set data
// captures that without needing separate templates.
const TEMPLATE_DEFS: { name: string; block: string; exercises: { name: string; sets: number; rir?: RepRange }[] }[] = [
  {
    name: 'Upper A',
    block: 'Block 1 (Weeks 1-4)',
    exercises: [
      { name: 'Overhead press', sets: 3 },
      { name: 'Incline dumbbell press', sets: 3 },
      { name: 'Lat pulldown', sets: 3 },
      { name: 'Chest-supported row', sets: 3 },
      { name: 'Lateral raise', sets: 3 },
      { name: 'Rear-delt fly', sets: 3 },
    ],
  },
  {
    name: 'Lower A',
    block: 'Block 1 (Weeks 1-4)',
    exercises: [
      { name: 'Hip thrust', sets: 3 },
      { name: 'Bulgarian split squat', sets: 3 },
      { name: 'Single-leg RDL', sets: 3 },
      { name: 'Poliquin controlled step-down', sets: 3 },
      { name: 'Standing calf raise', sets: 4 },
      { name: 'Tibialis raise', sets: 3 },
    ],
  },
  {
    name: 'Upper B',
    block: 'Block 1 (Weeks 1-4)',
    exercises: [
      { name: 'Dumbbell shoulder press', sets: 3 },
      { name: 'Cable lateral raise', sets: 4 },
      { name: 'Chest press', sets: 3 },
      { name: 'One-arm cable row', sets: 3 },
      { name: 'Reverse pec deck', sets: 3 },
      { name: 'Face pull', sets: 3 },
    ],
  },
  {
    name: 'Lower B',
    block: 'Block 1 (Weeks 1-4)',
    exercises: [
      { name: 'Spanish squat', sets: 3, rir: { min: 2, max: 3 } },
      { name: 'Hamstring curl', sets: 3, rir: { min: 2, max: 3 } },
      { name: 'Hip abduction', sets: 3, rir: { min: 2, max: 3 } },
      { name: 'Seated calf raise', sets: 3, rir: { min: 2, max: 3 } },
      { name: 'Spring-ankle isometric', sets: 3, rir: { min: 2, max: 3 } },
      { name: 'Single-leg balance + reach', sets: 3, rir: { min: 2, max: 3 } },
    ],
  },
]

export async function seedIfEmpty() {
  // Run the check-then-insert inside one transaction so two callers racing
  // (e.g. React StrictMode's double effect invocation in dev) can't both
  // see an empty table and each insert their own copy of the seed data.
  await db.transaction('rw', db.exercises, db.dayTemplates, async () => {
    const count = await db.exercises.count()
    if (count > 0) return

    const now = new Date().toISOString()
    const exercises: Exercise[] = CATALOG.map((def) => ({
      id: uid(),
      name: def.name,
      category: def.category,
      targetRepRange: RANGE_BY_FOCUS[def.focus],
      targetRIRRange: { min: 1, max: 2 },
      notes: def.focus,
      archived: false,
      createdAt: now,
    }))

    await db.exercises.bulkAdd(exercises)

    const templates: DayTemplate[] = TEMPLATE_DEFS.map((t) => ({
      id: uid(),
      name: t.name,
      block: t.block,
      archived: false,
      exercises: t.exercises.map((e, idx) => {
        const ex = exerciseFor(e.name, exercises)
        return {
          id: uid(),
          exerciseId: ex.id,
          order: idx,
          targetSets: e.sets,
          targetRepRange: ex.targetRepRange,
          targetRIRRange: e.rir ?? { min: 1, max: 2 },
          focus: ex.notes,
        }
      }),
    }))

    await db.dayTemplates.bulkAdd(templates)
  })
}
