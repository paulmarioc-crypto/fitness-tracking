import { db } from '../db/schema'
import { todayStr } from '../db/queries'
import { isConsecutiveDay } from './dates'

export interface StreakInfo {
  current: number
  longest: number
  loggedToday: boolean
  activeDates: string[] // sorted ascending, distinct
}

/**
 * A day counts toward the streak if the user logged *anything* that day:
 * a completed session, a cross-training entry, a health check-in, or sleep.
 * Intentionally not tied to hitting every planned exercise — the point is
 * to nudge re-engagement, not gate the data behind a perfect day.
 */
export async function computeStreak(): Promise<StreakInfo> {
  const [sessions, crossTraining, checkins, sleep] = await Promise.all([
    db.sessions.where('status').equals('completed').toArray(),
    db.crossTraining.toArray(),
    db.healthCheckins.toArray(),
    db.sleep.toArray(),
  ])

  const dateSet = new Set<string>()
  sessions.forEach((s) => dateSet.add(s.date))
  crossTraining.forEach((c) => dateSet.add(c.date))
  checkins.forEach((c) => dateSet.add(c.date))
  sleep.forEach((s) => dateSet.add(s.date))

  const activeDates = Array.from(dateSet).sort()
  if (activeDates.length === 0) {
    return { current: 0, longest: 0, loggedToday: false, activeDates: [] }
  }

  let longest = 1
  let run = 1
  for (let i = 1; i < activeDates.length; i++) {
    if (isConsecutiveDay(activeDates[i - 1], activeDates[i])) {
      run += 1
    } else {
      run = 1
    }
    longest = Math.max(longest, run)
  }

  const today = todayStr()
  const loggedToday = dateSet.has(today)
  const last = activeDates[activeDates.length - 1]

  // current streak: walk backward from the most recent active date, but only
  // if that date is today or yesterday (otherwise the streak is broken).
  let current = 0
  const mostRecentIsLiveStreak = last === today || isConsecutiveDay(last, today)
  if (mostRecentIsLiveStreak) {
    current = 1
    for (let i = activeDates.length - 1; i > 0; i--) {
      if (isConsecutiveDay(activeDates[i - 1], activeDates[i])) {
        current += 1
      } else {
        break
      }
    }
  }

  return { current, longest, loggedToday, activeDates }
}
