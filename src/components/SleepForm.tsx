import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { upsertSleep, todayStr } from '../db/queries'
import { Card, Button, TextField, NumberField } from './ui'

/** Simple manual entry for whatever your wearable already tracked overnight. */
export function SleepForm() {
  const [date, setDate] = useState(todayStr())
  const existing = useLiveQuery(() => db.sleep.where({ date }).first(), [date])

  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [hrv, setHrv] = useState('')
  const [restingHR, setRestingHR] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (existing) {
      setHours(String(Math.floor(existing.sleepDurationMin / 60)))
      setMinutes(String(existing.sleepDurationMin % 60))
      setHrv(existing.hrv !== undefined ? String(existing.hrv) : '')
      setRestingHR(existing.restingHR !== undefined ? String(existing.restingHR) : '')
      setNotes(existing.notes ?? '')
    } else {
      setHours('')
      setMinutes('')
      setHrv('')
      setRestingHR('')
      setNotes('')
    }
  }, [existing])

  async function submit() {
    const h = parseInt(hours, 10) || 0
    const m = parseInt(minutes, 10) || 0
    const sleepDurationMin = h * 60 + m
    if (sleepDurationMin <= 0) return
    await upsertSleep({
      date,
      sleepDurationMin,
      hrv: hrv ? parseFloat(hrv) : undefined,
      restingHR: restingHR ? parseInt(restingHR, 10) : undefined,
      notes: notes || undefined,
      source: 'manual',
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-medium">Log sleep</h2>
      <TextField label="Night of" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <div>
        <span className="text-xs text-text-dim block mb-1">Sleep duration</span>
        <div className="flex gap-2">
          <NumberField placeholder="hr" value={hours} onChange={(e) => setHours(e.target.value)} className="flex-1" />
          <NumberField placeholder="min" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="flex-1" />
        </div>
      </div>

      <div className="flex gap-2">
        <NumberField label="HRV (ms, optional)" value={hrv} onChange={(e) => setHrv(e.target.value)} className="flex-1" />
        <NumberField label="Resting HR (optional)" value={restingHR} onChange={(e) => setRestingHR(e.target.value)} className="flex-1" />
      </div>

      <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How you felt, anything unusual" />

      <Button onClick={submit}>{saved ? 'Logged ✓' : existing ? 'Update sleep' : 'Log sleep'}</Button>
    </Card>
  )
}
