import { db } from './schema'
import type { Exercise, DayTemplate, ExerciseCategory, RepRange, LoadBasis } from '../types'

const uid = () => crypto.randomUUID()

interface SeedExerciseDef {
  name: string
  category: ExerciseCategory
  focus: string
  repRange: RepRange
}

// Exercise catalog pulled from the 12-week athletic development plan
// (shoulders/glutes/calves/ankle-stability priorities). targetRepRange here
// is a general default for the exercise (e.g. shown when added outside a
// template) — the day templates below carry the block-specific prescription
// that actually governs each session. Users can edit, archive, or add to
// this freely from the Exercises page.
const CATALOG: SeedExerciseDef[] = [
  { name: 'Overhead press', category: 'upper', focus: 'Shoulder strength', repRange: { min: 8, max: 10 } },
  { name: 'Barbell overhead press', category: 'upper', focus: 'Heavier shoulder strength', repRange: { min: 6, max: 8 } },
  { name: 'Dumbbell shoulder press', category: 'upper', focus: 'Shoulder hypertrophy', repRange: { min: 6, max: 12 } },
  { name: 'Incline dumbbell press', category: 'upper', focus: 'Chest + anterior shoulder', repRange: { min: 6, max: 12 } },
  { name: 'Chest press', category: 'upper', focus: 'Chest maintenance/build', repRange: { min: 8, max: 12 } },
  { name: 'Bench/chest press', category: 'upper', focus: 'Chest strength', repRange: { min: 6, max: 10 } },
  { name: 'Lat pulldown', category: 'upper', focus: 'Vertical pull', repRange: { min: 8, max: 12 } },
  { name: 'Pull-up / pulldown', category: 'upper', focus: 'Vertical pull strength', repRange: { min: 6, max: 10 } },
  { name: 'Chest-supported row', category: 'upper', focus: 'Back strength', repRange: { min: 8, max: 12 } },
  { name: 'One-arm cable row', category: 'upper', focus: 'Back + unilateral control', repRange: { min: 10, max: 12 } },
  { name: 'Single-arm row', category: 'upper', focus: 'Back strength', repRange: { min: 8, max: 12 } },
  { name: 'Lateral raise', category: 'upper', focus: 'Shoulder width', repRange: { min: 10, max: 20 } },
  { name: 'Cable lateral raise', category: 'upper', focus: 'Shoulder hypertrophy', repRange: { min: 10, max: 20 } },
  { name: 'Rear-delt fly', category: 'upper', focus: 'Rear delt / upper-back balance', repRange: { min: 12, max: 20 } },
  { name: 'Reverse pec deck', category: 'upper', focus: 'Rear delts', repRange: { min: 12, max: 20 } },
  { name: 'Face pull', category: 'upper', focus: 'Scapular/rear-delt work', repRange: { min: 15, max: 20 } },
  { name: 'Hip thrust', category: 'lower', focus: 'Glute strength', repRange: { min: 6, max: 10 } },
  { name: 'Bulgarian split squat', category: 'lower', focus: 'Single-leg strength', repRange: { min: 6, max: 8 } },
  { name: 'Single-leg RDL', category: 'lower', focus: 'Glute/hamstring + balance', repRange: { min: 6, max: 8 } },
  { name: 'Poliquin controlled step-down', category: 'lower', focus: 'Knee/ankle control', repRange: { min: 8, max: 8 } },
  { name: 'Spanish squat', category: 'lower', focus: 'Quadriceps/knee capacity', repRange: { min: 10, max: 10 } },
  { name: 'Reverse Nordic isometric', category: 'lower', focus: 'Quadriceps capacity', repRange: { min: 5, max: 5 } },
  { name: 'Hamstring curl', category: 'lower', focus: 'Hamstrings', repRange: { min: 8, max: 15 } },
  { name: 'Hip abduction', category: 'lower', focus: 'Glute medius', repRange: { min: 12, max: 20 } },
  { name: 'Standing calf raise', category: 'lower', focus: 'Gastrocnemius + calf capacity', repRange: { min: 8, max: 15 } },
  { name: 'Seated calf raise', category: 'lower', focus: 'Soleus', repRange: { min: 12, max: 20 } },
  { name: 'Split-stance soleus calf raise', category: 'lower', focus: 'Soleus/calf', repRange: { min: 10, max: 15 } },
  { name: 'Tibialis raise', category: 'lower', focus: 'Anterior shin / dorsiflexion strength', repRange: { min: 10, max: 20 } },
  { name: 'Spring-ankle isometric', category: 'mobility', focus: 'Ankle stiffness/control', repRange: { min: 20, max: 20 } },
  { name: 'Single-leg balance + reach', category: 'mobility', focus: 'Dynamic balance', repRange: { min: 8, max: 12 } },
  { name: 'Low-amplitude skater hop to stick landing', category: 'mobility', focus: 'Controlled lateral landing', repRange: { min: 4, max: 4 } },
  // Heavy top-end leg work, prescribed as a percentage of estimated max
  // rather than by double progression.
  { name: 'Barbell back squat', category: 'lower', focus: 'Heavy bilateral strength', repRange: { min: 3, max: 5 } },
  { name: 'Leg press', category: 'lower', focus: 'Heavy leg strength', repRange: { min: 3, max: 5 } },
]

interface TemplateExerciseDef {
  name: string
  sets: number
  reps: RepRange
  label: string // raw "sets x reps" text from the plan
  focus: string
  rir?: RepRange
  loadBasis?: LoadBasis
  percentOfMax?: number
}

/** One heavy lift per leg day, loaded off estimated 1RM instead of double progression. */
const HEAVY_LEG_LIFT = (name: string): TemplateExerciseDef => ({
  name,
  sets: 3,
  reps: { min: 3, max: 5 },
  label: '3 × 3–5 @ 80% of max',
  focus: 'Heavy strength',
  rir: { min: 2, max: 3 },
  loadBasis: 'percent_of_max',
  percentOfMax: 0.8,
})

interface TemplateDef {
  dayType: string
  block: number
  blockLabel: string
  exercises: TemplateExerciseDef[]
}

const DEFAULT_RIR: RepRange = { min: 1, max: 2 }
// Thursday (Lower B) stays higher-RIR every block because soccer is that evening.
const LOWER_B_RIR: RepRange = { min: 2, max: 3 }

const BLOCK_LABELS: Record<number, string> = {
  1: 'Block 1 (Weeks 1-4): Capacity + Control',
  2: 'Block 2 (Weeks 5-8): Strength + Eccentric Control',
  3: 'Block 3 (Weeks 9-12): Strength + Athletic Resilience/Power',
}

const TEMPLATE_DEFS: TemplateDef[] = [
  // ---- Block 1: Weeks 1-4 ----
  {
    dayType: 'Upper A',
    block: 1,
    blockLabel: BLOCK_LABELS[1],
    exercises: [
      { name: 'Overhead press', sets: 3, reps: { min: 8, max: 10 }, label: '3 × 8–10', focus: 'Shoulder strength' },
      { name: 'Incline dumbbell press', sets: 3, reps: { min: 8, max: 12 }, label: '3 × 8–12', focus: 'Chest + anterior shoulder' },
      { name: 'Lat pulldown', sets: 3, reps: { min: 8, max: 12 }, label: '3 × 8–12', focus: 'Vertical pull' },
      { name: 'Chest-supported row', sets: 3, reps: { min: 10, max: 12 }, label: '3 × 10–12', focus: 'Back without excess fatigue' },
      { name: 'Lateral raise', sets: 3, reps: { min: 12, max: 20 }, label: '3 × 12–20', focus: 'Shoulder-width priority' },
      { name: 'Rear-delt fly', sets: 3, reps: { min: 12, max: 20 }, label: '3 × 12–20', focus: 'Rear delt / upper-back balance' },
    ],
  },
  {
    dayType: 'Lower A',
    block: 1,
    blockLabel: BLOCK_LABELS[1],
    exercises: [
      HEAVY_LEG_LIFT('Barbell back squat'),
      { name: 'Hip thrust', sets: 3, reps: { min: 8, max: 10 }, label: '3 × 8–10', focus: 'Glute strength' },
      { name: 'Bulgarian split squat', sets: 3, reps: { min: 8, max: 8 }, label: '3 × 8 / leg', focus: 'Single-leg strength' },
      { name: 'Single-leg RDL', sets: 3, reps: { min: 8, max: 8 }, label: '3 × 8 / leg', focus: 'Glute/hamstring + balance' },
      { name: 'Poliquin controlled step-down', sets: 3, reps: { min: 8, max: 8 }, label: '3 × 8 / leg', focus: 'Knee/ankle control' },
      { name: 'Standing calf raise', sets: 4, reps: { min: 10, max: 15 }, label: '4 × 10–15', focus: 'Gastrocnemius + calf capacity' },
      { name: 'Tibialis raise', sets: 3, reps: { min: 15, max: 20 }, label: '3 × 15–20', focus: 'Anterior shin / dorsiflexion strength' },
    ],
  },
  {
    dayType: 'Upper B',
    block: 1,
    blockLabel: BLOCK_LABELS[1],
    exercises: [
      { name: 'Dumbbell shoulder press', sets: 3, reps: { min: 8, max: 12 }, label: '3 × 8–12', focus: 'Shoulder hypertrophy' },
      { name: 'Cable lateral raise', sets: 4, reps: { min: 12, max: 20 }, label: '4 × 12–20', focus: 'Primary shoulder hypertrophy' },
      { name: 'Chest press', sets: 3, reps: { min: 8, max: 12 }, label: '3 × 8–12', focus: 'Chest maintenance/build' },
      { name: 'One-arm cable row', sets: 3, reps: { min: 10, max: 12 }, label: '3 × 10–12 / side', focus: 'Back + unilateral control' },
      { name: 'Reverse pec deck', sets: 3, reps: { min: 12, max: 20 }, label: '3 × 12–20', focus: 'Rear delts' },
      { name: 'Face pull', sets: 3, reps: { min: 15, max: 20 }, label: '3 × 15–20', focus: 'Scapular/rear-delt work' },
    ],
  },
  {
    dayType: 'Lower B',
    block: 1,
    blockLabel: BLOCK_LABELS[1],
    exercises: [
      HEAVY_LEG_LIFT('Leg press'),
      { name: 'Spanish squat', sets: 3, reps: { min: 10, max: 10 }, label: '3 × 10 + 20-sec final hold', focus: 'Quadriceps/knee capacity', rir: LOWER_B_RIR },
      { name: 'Hamstring curl', sets: 3, reps: { min: 10, max: 15 }, label: '3 × 10–15', focus: 'Hamstrings', rir: LOWER_B_RIR },
      { name: 'Hip abduction', sets: 3, reps: { min: 15, max: 20 }, label: '3 × 15–20', focus: 'Glute medius', rir: LOWER_B_RIR },
      { name: 'Seated calf raise', sets: 3, reps: { min: 12, max: 20 }, label: '3 × 12–20', focus: 'Soleus', rir: LOWER_B_RIR },
      { name: 'Spring-ankle isometric', sets: 3, reps: { min: 20, max: 20 }, label: '3 × 20 sec', focus: 'Ankle stiffness/control', rir: LOWER_B_RIR },
      { name: 'Single-leg balance + reach', sets: 3, reps: { min: 8, max: 12 }, label: '3 rounds / leg', focus: 'Dynamic balance', rir: LOWER_B_RIR },
    ],
  },
  // ---- Block 2: Weeks 5-8 ----
  {
    dayType: 'Upper A',
    block: 2,
    blockLabel: BLOCK_LABELS[2],
    exercises: [
      { name: 'Barbell overhead press', sets: 4, reps: { min: 6, max: 8 }, label: '4 × 6–8', focus: 'Heavier shoulder strength' },
      { name: 'Incline dumbbell press', sets: 3, reps: { min: 6, max: 10 }, label: '3 × 6–10', focus: 'Chest strength' },
      { name: 'Pull-up / pulldown', sets: 3, reps: { min: 6, max: 10 }, label: '3 × 6–10', focus: 'Vertical pull strength' },
      { name: 'Chest-supported row', sets: 3, reps: { min: 8, max: 10 }, label: '3 × 8–10', focus: 'Back strength' },
      { name: 'Cable lateral raise', sets: 4, reps: { min: 10, max: 15 }, label: '4 × 10–15', focus: 'Shoulder hypertrophy' },
      { name: 'Reverse pec deck', sets: 3, reps: { min: 12, max: 15 }, label: '3 × 12–15', focus: 'Rear delts' },
    ],
  },
  {
    dayType: 'Lower A',
    block: 2,
    blockLabel: BLOCK_LABELS[2],
    exercises: [
      HEAVY_LEG_LIFT('Barbell back squat'),
      { name: 'Hip thrust', sets: 4, reps: { min: 6, max: 8 }, label: '4 × 6–8', focus: 'Heavier glute strength' },
      { name: 'Bulgarian split squat', sets: 3, reps: { min: 6, max: 8 }, label: '3 × 6–8 / leg, 3-sec lowering', focus: 'Unilateral eccentric control' },
      { name: 'Single-leg RDL', sets: 3, reps: { min: 6, max: 8 }, label: '3 × 6–8 / leg', focus: 'Posterior-chain strength' },
      { name: 'Poliquin controlled step-down', sets: 3, reps: { min: 8, max: 8 }, label: '3 × 8 / leg, 4–5 sec lowering', focus: 'Knee/ankle eccentric control' },
      { name: 'Standing calf raise', sets: 4, reps: { min: 8, max: 12 }, label: '4 × 8–12, slow eccentric', focus: 'Loaded calf strength' },
      { name: 'Tibialis raise', sets: 3, reps: { min: 10, max: 15 }, label: '3 × 10–15, 3-sec top hold', focus: 'Tibialis strength/control' },
    ],
  },
  {
    dayType: 'Upper B',
    block: 2,
    blockLabel: BLOCK_LABELS[2],
    exercises: [
      { name: 'Dumbbell shoulder press', sets: 3, reps: { min: 6, max: 10 }, label: '3 × 6–10', focus: 'Shoulder strength/hypertrophy' },
      { name: 'Cable lateral raise', sets: 4, reps: { min: 12, max: 20 }, label: '4 × 12–20', focus: 'Shoulder volume' },
      { name: 'Bench/chest press', sets: 3, reps: { min: 6, max: 10 }, label: '3 × 6–10', focus: 'Chest strength' },
      { name: 'Single-arm row', sets: 3, reps: { min: 8, max: 12 }, label: '3 × 8–12 / side', focus: 'Back strength' },
      { name: 'Rear-delt fly', sets: 3, reps: { min: 12, max: 20 }, label: '3 × 12–20', focus: 'Rear delts' },
      { name: 'Face pull', sets: 3, reps: { min: 15, max: 20 }, label: '3 × 15–20', focus: 'Scapular control' },
    ],
  },
  {
    dayType: 'Lower B',
    block: 2,
    blockLabel: BLOCK_LABELS[2],
    exercises: [
      HEAVY_LEG_LIFT('Leg press'),
      { name: 'Reverse Nordic isometric', sets: 3, reps: { min: 5, max: 5 }, label: '2–3 × 5, 5-sec hold', focus: 'Quadriceps capacity', rir: LOWER_B_RIR },
      { name: 'Hamstring curl', sets: 3, reps: { min: 8, max: 12 }, label: '3 × 8–12', focus: 'Hamstrings', rir: LOWER_B_RIR },
      { name: 'Hip abduction', sets: 3, reps: { min: 12, max: 20 }, label: '3 × 12–20', focus: 'Glute medius', rir: LOWER_B_RIR },
      { name: 'Split-stance soleus calf raise', sets: 3, reps: { min: 10, max: 15 }, label: '3 × 10–15', focus: 'Soleus/calf', rir: LOWER_B_RIR },
      { name: 'Spring-ankle isometric', sets: 3, reps: { min: 20, max: 20 }, label: '3 × 20 sec', focus: 'Ankle stiffness/control', rir: LOWER_B_RIR },
      { name: 'Single-leg balance + reach', sets: 3, reps: { min: 8, max: 12 }, label: '3 rounds', focus: 'Balance + control', rir: LOWER_B_RIR },
    ],
  },
  // ---- Block 3: Weeks 9-12 ----
  {
    dayType: 'Upper A',
    block: 3,
    blockLabel: BLOCK_LABELS[3],
    exercises: [
      { name: 'Overhead press', sets: 4, reps: { min: 5, max: 8 }, label: '4 × 5–8', focus: 'Strength' },
      { name: 'Incline dumbbell press', sets: 3, reps: { min: 6, max: 10 }, label: '3 × 6–10', focus: 'Chest' },
      { name: 'Pull-up / pulldown', sets: 3, reps: { min: 6, max: 10 }, label: '3 × 6–10', focus: 'Back' },
      { name: 'Chest-supported row', sets: 3, reps: { min: 8, max: 10 }, label: '3 × 8–10', focus: 'Back' },
      { name: 'Lateral raise', sets: 4, reps: { min: 10, max: 15 }, label: '4 × 10–15', focus: 'Shoulders' },
      { name: 'Rear-delt fly', sets: 3, reps: { min: 12, max: 15 }, label: '3 × 12–15', focus: 'Rear delts' },
    ],
  },
  {
    dayType: 'Lower A',
    block: 3,
    blockLabel: BLOCK_LABELS[3],
    exercises: [
      HEAVY_LEG_LIFT('Barbell back squat'),
      { name: 'Hip thrust', sets: 4, reps: { min: 5, max: 8 }, label: '4 × 5–8', focus: 'Glute strength' },
      { name: 'Bulgarian split squat', sets: 3, reps: { min: 6, max: 8 }, label: '3 × 6–8 / leg', focus: 'Unilateral strength' },
      { name: 'Single-leg RDL', sets: 3, reps: { min: 6, max: 8 }, label: '3 × 6–8 / leg', focus: 'Posterior-chain + balance' },
      { name: 'Poliquin controlled step-down', sets: 3, reps: { min: 8, max: 8 }, label: '3 × 8 / leg', focus: 'Control' },
      { name: 'Standing calf raise', sets: 4, reps: { min: 6, max: 10 }, label: '4 × 6–10', focus: 'Calf strength' },
      { name: 'Low-amplitude skater hop to stick landing', sets: 3, reps: { min: 4, max: 4 }, label: '3 × 4 / side', focus: 'Controlled lateral landing' },
    ],
  },
  {
    dayType: 'Upper B',
    block: 3,
    blockLabel: BLOCK_LABELS[3],
    exercises: [
      { name: 'Dumbbell shoulder press', sets: 3, reps: { min: 6, max: 10 }, label: '3 × 6–10', focus: 'Shoulders' },
      { name: 'Cable lateral raise', sets: 4, reps: { min: 12, max: 20 }, label: '4 × 12–20', focus: 'Shoulder hypertrophy' },
      { name: 'Bench/chest press', sets: 3, reps: { min: 6, max: 10 }, label: '3 × 6–10', focus: 'Chest' },
      { name: 'Single-arm row', sets: 3, reps: { min: 8, max: 12 }, label: '3 × 8–12 / side', focus: 'Back' },
      { name: 'Reverse pec deck', sets: 3, reps: { min: 12, max: 20 }, label: '3 × 12–20', focus: 'Rear delts' },
      { name: 'Face pull', sets: 3, reps: { min: 15, max: 20 }, label: '3 × 15–20', focus: 'Scapular control' },
    ],
  },
  {
    dayType: 'Lower B',
    block: 3,
    blockLabel: BLOCK_LABELS[3],
    exercises: [
      HEAVY_LEG_LIFT('Leg press'),
      { name: 'Spanish squat', sets: 3, reps: { min: 10, max: 10 }, label: '2–3 × 10 + hold', focus: 'Knee capacity', rir: LOWER_B_RIR },
      { name: 'Hamstring curl', sets: 3, reps: { min: 8, max: 12 }, label: '3 × 8–12', focus: 'Hamstrings', rir: LOWER_B_RIR },
      { name: 'Hip abduction', sets: 3, reps: { min: 12, max: 15 }, label: '3 × 12–15', focus: 'Glute medius', rir: LOWER_B_RIR },
      { name: 'Split-stance soleus calf raise', sets: 3, reps: { min: 10, max: 15 }, label: '3 × 10–15', focus: 'Soleus', rir: LOWER_B_RIR },
      { name: 'Tibialis raise', sets: 3, reps: { min: 15, max: 20 }, label: '3 × 15–20', focus: 'Anterior shin', rir: LOWER_B_RIR },
      { name: 'Single-leg balance + reach', sets: 3, reps: { min: 8, max: 12 }, label: '3 rounds', focus: 'Stability before soccer', rir: LOWER_B_RIR },
    ],
  },
]

/**
 * Idempotent and self-healing by design, not just "run once": every catalog
 * exercise is upserted by name (existing rows are left untouched — this
 * never overwrites your edits or history), and every (dayType, block)
 * template is filled in if missing, regardless of what already exists. This
 * matters because a schema upgrade can clear dayTemplates (see
 * db/schema.ts's version(3) upgrade) while exercises survive — a rename in
 * this catalog must never leave a lookup unable to find an exercise and
 * abort the whole reseed, which previously left day templates permanently
 * empty until this ran cleanly again.
 */
export async function seedIfEmpty() {
  await db.transaction('rw', db.exercises, db.dayTemplates, async () => {
    const existingExercises = await db.exercises.toArray()
    const exerciseByName = new Map(existingExercises.map((e) => [e.name, e]))

    const now = new Date().toISOString()
    const newExercises: Exercise[] = []
    for (const def of CATALOG) {
      if (exerciseByName.has(def.name)) continue
      const ex: Exercise = {
        id: uid(),
        name: def.name,
        category: def.category,
        targetRepRange: def.repRange,
        targetRIRRange: DEFAULT_RIR,
        notes: def.focus,
        archived: false,
        createdAt: now,
      }
      newExercises.push(ex)
      exerciseByName.set(def.name, ex)
    }
    if (newExercises.length > 0) await db.exercises.bulkAdd(newExercises)

    const existingTemplates = await db.dayTemplates.toArray()
    const existingTemplateKeys = new Set(existingTemplates.map((t) => `${t.dayType}::${t.block}`))

    const newTemplates: DayTemplate[] = []
    for (const t of TEMPLATE_DEFS) {
      if (existingTemplateKeys.has(`${t.dayType}::${t.block}`)) continue
      newTemplates.push({
        id: uid(),
        name: t.dayType,
        dayType: t.dayType,
        block: t.block,
        blockLabel: t.blockLabel,
        archived: false,
        exercises: t.exercises.map((e, idx) => {
          const ex = exerciseByName.get(e.name)
          if (!ex) throw new Error(`Seed exercise missing from CATALOG: ${e.name}`)
          return {
            id: uid(),
            exerciseId: ex.id,
            order: idx,
            targetSets: e.sets,
            targetRepRange: e.reps,
            targetRIRRange: e.rir ?? DEFAULT_RIR,
            prescriptionLabel: e.label,
            focus: e.focus,
            loadBasis: e.loadBasis,
            percentOfMax: e.percentOfMax,
          }
        }),
      })
    }
    if (newTemplates.length > 0) await db.dayTemplates.bulkAdd(newTemplates)
  })
}
