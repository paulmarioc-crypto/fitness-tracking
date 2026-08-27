import { parseISO, getDay } from 'date-fns'

/**
 * Section 6 of the plan: "10-15 Minute Mobility / Resilience Add-Ons" —
 * attached to bike days rather than a separate workout. Fixed content
 * (doesn't progress by block, unlike the lifting templates), keyed by
 * which bike day of the week it is.
 */
export interface AddOnExercise {
  name: string
  prescription: string
}

export interface BikeAddOnVariant {
  id: 'ankle' | 'hip_knee' | 'recovery'
  day: 'Monday' | 'Friday' | 'Sunday'
  title: string
  rounds?: number
  exercises: AddOnExercise[]
}

export const BIKE_ADDONS: BikeAddOnVariant[] = [
  {
    id: 'ankle',
    day: 'Monday',
    title: 'Ankle Mobility + Control',
    rounds: 2,
    exercises: [
      { name: 'Knee-to-wall dorsiflexion', prescription: '8/side' },
      { name: 'Tibialis raise', prescription: '15' },
      { name: '3-way calf isometric', prescription: '15 sec each position' },
      { name: 'Single-leg balance', prescription: '30 sec/side' },
      { name: 'Hip airplane / controlled hip rotation', prescription: '5/side' },
    ],
  },
  {
    id: 'hip_knee',
    day: 'Friday',
    title: 'Hip/Knee Mobility',
    rounds: 2,
    exercises: [
      { name: 'Knee-to-wall', prescription: '8/side' },
      { name: 'Hip-flexor mobility', prescription: '30 sec/side' },
      { name: 'Adductor rock-back', prescription: '8/side' },
      { name: 'Spanish squat isometric', prescription: '20-30 sec' },
      { name: 'Calf/soleus mobility', prescription: '30 sec/side' },
    ],
  },
  {
    id: 'recovery',
    day: 'Sunday',
    title: 'Easy Recovery Mobility',
    exercises: [
      { name: 'Ankle circles', prescription: '' },
      { name: 'Knee-to-wall', prescription: '' },
      { name: 'Calf mobility', prescription: '' },
      { name: 'Hip rotation', prescription: '' },
      { name: 'Gentle hamstring mobility', prescription: '' },
    ],
  },
]

export function getAddOnById(id: string): BikeAddOnVariant | undefined {
  return BIKE_ADDONS.find((v) => v.id === id)
}

/**
 * The variant the plan pairs with this weekday (Mon/Fri/Sun bike days).
 * Only a *default* — the add-on is always offered regardless of weekday,
 * because riding on an off-schedule day is no reason to hide the routine.
 */
export function getDefaultAddOnForDate(dateStr: string): BikeAddOnVariant {
  const dow = getDay(parseISO(dateStr)) // 0 = Sunday, 1 = Monday, ..., 5 = Friday
  if (dow === 5 || dow === 6) return BIKE_ADDONS[1] // Fri/Sat -> hip/knee
  if (dow === 0) return BIKE_ADDONS[2] // Sun -> easy recovery
  return BIKE_ADDONS[0] // Mon-Thu -> ankle mobility + control
}

/** True when the plan actually schedules a bike session on this weekday. */
export function isScheduledBikeDay(dateStr: string): boolean {
  const dow = getDay(parseISO(dateStr))
  return dow === 1 || dow === 5 || dow === 0
}
