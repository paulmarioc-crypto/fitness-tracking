import { db } from '../db/schema'
import type { HealthCheckin } from '../types'

export interface HealthFlagStatus {
  recent: HealthCheckin[]
  consecutiveSwellingDays: number
  swellingAlert: boolean
  givingWayAlert: boolean
  shinTrendUp: boolean
}

/**
 * Surfaces the one thing worth a nudge: 2+ consecutive days of knee or
 * ankle swelling. Also flags any giving-way episode (never fine to ignore)
 * and a rising left-shin symptom trend over the last few check-ins.
 */
export async function getHealthFlagStatus(): Promise<HealthFlagStatus> {
  const all = await db.healthCheckins.orderBy('date').toArray()
  const recent = all.slice(-14)

  let consecutive = 0
  let maxConsecutive = 0
  for (const c of recent) {
    if (c.kneeSwelling || c.ankleSwelling) {
      consecutive += 1
      maxConsecutive = Math.max(maxConsecutive, consecutive)
    } else {
      consecutive = 0
    }
  }

  // trailing streak (as of most recent check-in), not just the max in-window
  let trailing = 0
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].kneeSwelling || recent[i].ankleSwelling) trailing += 1
    else break
  }

  const givingWayAlert = recent.slice(-7).some((c) => c.givingWay)

  const lastThree = recent.slice(-3)
  const shinTrendUp = lastThree.length === 3 && lastThree[2].leftShinRating > lastThree[0].leftShinRating && lastThree[2].leftShinRating >= 4

  return {
    recent,
    consecutiveSwellingDays: trailing,
    swellingAlert: trailing >= 2,
    givingWayAlert,
    shinTrendUp,
  }
}
