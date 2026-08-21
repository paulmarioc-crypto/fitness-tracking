import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { computeStreak, type StreakInfo } from '../lib/streak'

export function useStreak(): StreakInfo | undefined {
  const tick = useLiveQuery(() => Promise.all([db.sessions.toArray(), db.crossTraining.toArray(), db.healthCheckins.toArray()]))
  const [streak, setStreak] = useState<StreakInfo>()

  useEffect(() => {
    computeStreak().then(setStreak)
  }, [tick])

  return streak
}

export function StreakBadge() {
  const streak = useStreak()
  if (!streak) return null

  return (
    <div className="flex items-center gap-3 bg-surface rounded-2xl border border-border p-4">
      <div className="text-4xl leading-none">{streak.current > 0 ? '🔥' : '💤'}</div>
      <div>
        <p className="text-2xl font-bold leading-tight">
          {streak.current} day{streak.current === 1 ? '' : 's'}
        </p>
        <p className="text-sm text-text-dim">
          {streak.loggedToday ? 'Logged today — nice.' : streak.current > 0 ? 'Log something today to keep it going.' : 'Log anything today to start a new streak.'}
        </p>
      </div>
      {streak.longest > streak.current && <div className="ml-auto text-right text-xs text-text-dim">Best<br /><span className="text-text font-semibold">{streak.longest}d</span></div>}
    </div>
  )
}
