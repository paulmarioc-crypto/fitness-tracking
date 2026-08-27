import { useEffect, useState } from 'react'
import { addCrossTraining } from '../db/queries'
import { todayStr } from '../db/queries'
import { BIKE_ADDONS, getAddOnById, getDefaultAddOnForDate, isScheduledBikeDay } from '../lib/bikeAddOns'
import { Card, Button, TextField, NumberField, SegmentedControl } from './ui'
import type { CrossTrainingType, Intensity } from '../types'

const LABELS: Record<CrossTrainingType, string> = { bike: 'Bike', soccer: 'Soccer', volleyball: 'Volleyball', other: 'Other' }

export function CrossTrainingForm({ type }: { type: CrossTrainingType }) {
  const [date, setDate] = useState(todayStr())
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [avgHR, setAvgHR] = useState('')
  const [maxHR, setMaxHR] = useState('')
  const [avgPower, setAvgPower] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [completedAddOn, setCompletedAddOn] = useState<Set<string>>(new Set())
  const [addOnId, setAddOnId] = useState<string | null>(null)

  const isBike = type === 'bike'
  // Always offered on bike days; the date only picks which variant is preselected.
  const addOn = isBike ? (addOnId ? getAddOnById(addOnId) ?? getDefaultAddOnForDate(date) : getDefaultAddOnForDate(date)) : null

  useEffect(() => {
    setCompletedAddOn(new Set())
    setAddOnId(null)
  }, [date])

  function toggleAddOnItem(name: string) {
    setCompletedAddOn((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function submit() {
    const durationMin = parseInt(duration, 10)
    if (Number.isNaN(durationMin)) return
    await addCrossTraining({
      date,
      type,
      durationMin,
      intensity: isBike ? undefined : intensity,
      avgHR: avgHR ? parseInt(avgHR, 10) : undefined,
      maxHR: maxHR ? parseInt(maxHR, 10) : undefined,
      avgPower: isBike && avgPower ? parseInt(avgPower, 10) : undefined,
      notes: notes || undefined,
      bikeAddOnCompleted: addOn ? Array.from(completedAddOn) : undefined,
      bikeAddOnVariant: addOn?.id,
      source: 'manual',
    })
    setDuration('')
    setAvgHR('')
    setMaxHR('')
    setAvgPower('')
    setNotes('')
    setCompletedAddOn(new Set())
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
        <NumberField label="Avg BPM (optional)" value={avgHR} onChange={(e) => setAvgHR(e.target.value)} className="flex-1" />
        <NumberField label="Max BPM (optional)" value={maxHR} onChange={(e) => setMaxHR(e.target.value)} className="flex-1" />
      </div>
      {isBike && (
        <NumberField label="Avg power W (optional)" value={avgPower} onChange={(e) => setAvgPower(e.target.value)} />
      )}

      <TextField label="Notes (intervals, how it felt, etc.)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />

      {addOn && (
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-sm font-medium">15-min add-on, right after the ride</p>
          <p className="text-xs text-text-dim mb-2">
            {isScheduledBikeDay(date)
              ? `${addOn.day} is a bike day in your plan — this routine is the match.`
              : 'Off-schedule ride — pick whichever routine fits.'}
          </p>

          <div className="grid grid-cols-3 gap-1 mb-2">
            {BIKE_ADDONS.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setAddOnId(v.id)
                  setCompletedAddOn(new Set())
                }}
                className={`px-1 py-1.5 rounded-lg text-[11px] font-medium leading-tight transition ${
                  addOn.id === v.id ? 'bg-accent text-black' : 'bg-surface border border-border text-text-dim'
                }`}
              >
                {v.title}
              </button>
            ))}
          </div>

          <p className="text-xs text-text-dim mb-1.5">
            {addOn.title}
            {addOn.rounds ? ` · ${addOn.rounds} rounds` : ''} — check off what you did.
          </p>
          <div className="flex flex-col gap-1.5">
            {addOn.exercises.map((ex) => {
              const done = completedAddOn.has(ex.name)
              return (
                <button
                  key={ex.name}
                  onClick={() => toggleAddOnItem(ex.name)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-sm text-left border transition ${done ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-surface border-border text-text-dim'}`}
                >
                  <span>{done ? '☑' : '☐'} {ex.name}</span>
                  {ex.prescription && <span className="text-xs opacity-80">{ex.prescription}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Button onClick={submit}>{saved ? 'Logged ✓' : `Log ${LABELS[type]} session`}</Button>
    </Card>
  )
}
