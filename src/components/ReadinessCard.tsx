import { Card, Badge } from './ui'
import type { ReadinessSignal, ReadinessLevel } from '../lib/readiness'

const TONE: Record<ReadinessLevel, { badge: 'default' | 'accent' | 'warn' | 'danger'; card: string; label: string }> = {
  unknown: { badge: 'default', card: '', label: 'No data' },
  normal: { badge: 'accent', card: 'border-accent/40 bg-accent/10', label: 'Normal' },
  compromised: { badge: 'warn', card: 'border-warn/50 bg-warn/10', label: 'Slightly down' },
  low: { badge: 'danger', card: 'border-danger/50 bg-danger/10', label: 'Low' },
}

/** Shows how last night's sleep is affecting today's load suggestions. */
export function ReadinessCard({ readiness, compact = false }: { readiness: ReadinessSignal; compact?: boolean }) {
  const tone = TONE[readiness.level]

  return (
    <Card className={tone.card}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Recovery</p>
        <Badge tone={tone.badge}>{tone.label}</Badge>
      </div>
      <p className="text-sm text-text-dim mt-1">{readiness.summary}</p>

      {readiness.flags.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {readiness.flags.map((f) => (
            <li key={f} className="text-xs text-text-dim">• {f}</li>
          ))}
        </ul>
      )}

      {!compact && readiness.baseline && (
        <p className="text-xs text-text-dim mt-2">
          Baseline from your last {readiness.baseline.nights} night{readiness.baseline.nights === 1 ? '' : 's'}:{' '}
          {Math.floor(readiness.baseline.durationMin / 60)}h {Math.round(readiness.baseline.durationMin % 60)}m
          {readiness.baseline.hrv !== undefined ? ` · HRV ${Math.round(readiness.baseline.hrv)}` : ''}
          {readiness.baseline.restingHR !== undefined ? ` · RHR ${Math.round(readiness.baseline.restingHR)}` : ''}
        </p>
      )}
    </Card>
  )
}
