import { useState } from 'react'
import { addCrossTraining } from '../db/queries'
import { todayStr } from '../db/queries'
import { Card, Button, TextField, NumberField, SegmentedControl } from './ui'
import type { CrossTrainingType, Intensity } from '../types'

const LABELS: Record<CrossTrainingType, string> = { bike: 'Bike', soccer: 'Soccer', volleyball: 'Volleyball', other: 'Other' }

export function CrossTrainingForm({ type }: { type: CrossTrainingType }) {
  const [date, setDate] = useState(todayStr())
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [avgHR, setAvgHR] = useState('')
  const [avgPower, setAvgPower] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const isBike = type === 'bike'

  async function submit() {
    const durationMin = parseInt(duration, 10)
    if (Number.isNaN(durationMin)) return
    await addCrossTraining({
      date,
      type,
      durationMin,
      intensity: isBike ? undefined : intensity,
      avgHR: avgHR ? parseInt(avgHR, 10) : undefined,
      avgPower: isBike && avgPower ? parseInt(avgPower, 10) : undefined,
      notes: notes || undefined,
      source: 'manual',
    })
    setDuration('')
    setAvgHR('')
    setAvgPower('')
    setNotes('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-medium">Log {LABELS[type]}</h2>
      <div className="flex gap-2">
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
        <NumberField label="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} className="flex-1" />
      </div>

      {!isBike && (
        <div>
          <span className="text-xs text-text-dim block mb-1">Intensity</span>
          <SegmentedControl
            value={intensity}
            onChange={setIntensity}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'hard', label: 'Hard' },
            ]}
          />
        </div>
      )}

      <div className="flex gap-2">
        <NumberField label="Avg HR (optional)" value={avgHR} onChange={(e) => setAvgHR(e.target.value)} className="flex-1" />
        {isBike && <NumberField label="Avg power W (optional)" value={avgPower} onChange={(e) => setAvgPower(e.target.value)} className="flex-1" />}
      </div>

      <TextField label="Notes (intervals, how it felt, etc.)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />

      <Button onClick={submit}>{saved ? 'Logged ✓' : `Log ${LABELS[type]} session`}</Button>
    </Card>
  )
}
