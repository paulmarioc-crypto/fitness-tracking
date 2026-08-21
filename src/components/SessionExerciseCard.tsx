import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { addSet, updateSet, deleteSet, setSessionExerciseStatus } from '../db/queries'
import { getLoadSuggestion, type LoadSuggestion } from '../lib/progression'
import { Button, Badge } from './ui'
import type { SessionExercise } from '../types'

export function SessionExerciseCard({ sessionExercise, isDeloadWeek }: { sessionExercise: SessionExercise; isDeloadWeek: boolean }) {
  const exercise = useLiveQuery(() => db.exercises.get(sessionExercise.exerciseId), [sessionExercise.exerciseId])
  const sets = useLiveQuery(() => db.sets.where({ sessionExerciseId: sessionExercise.id }).sortBy('setNumber'), [sessionExercise.id])
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rir, setRir] = useState('')
  const [expanded, setExpanded] = useState(!sessionExercise.completed && !sessionExercise.skipped)
  const [suggestion, setSuggestion] = useState<LoadSuggestion>()

  useEffect(() => {
    if (!exercise) return
    getLoadSuggestion(
      sessionExercise.exerciseId,
      exercise.category,
      sessionExercise.targetRepRange,
      sessionExercise.targetRIRRange,
      sessionExercise.targetSets ?? 3,
      isDeloadWeek
    ).then(setSuggestion)
  }, [exercise, sessionExercise, isDeloadWeek])

  if (!exercise) return null

  async function logSet() {
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (Number.isNaN(w) || Number.isNaN(r)) return
    const rirVal = rir.trim() === '' ? null : parseInt(rir, 10)
    await addSet(sessionExercise.id, w, r, Number.isNaN(rirVal as number) ? null : rirVal)
    // keep weight/rir prefilled for the next set, clear reps only if you want fresh entry each time
    setReps('')
  }

  const target = sessionExercise.targetSets ?? undefined
  const repRange = sessionExercise.targetRepRange
  const targetLine = sessionExercise.prescriptionLabel
    ? `Target: ${target ? `${target} × ` : ''}${sessionExercise.prescriptionLabel.replace(/^\d+\s*×\s*/, '')}`
    : target && repRange
      ? `Target: ${target} × ${repRange.min}–${repRange.max}`
      : null

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <button className="w-full flex items-center justify-between p-4" onClick={() => setExpanded((v) => !v)}>
        <div className="text-left">
          <p className="font-medium flex items-center gap-2">
            {exercise.name}
            {sessionExercise.skipped && <Badge tone="warn">Skipped</Badge>}
            {sessionExercise.completed && !sessionExercise.skipped && <Badge tone="accent">Done</Badge>}
          </p>
          <p className="text-xs text-text-dim">
            {sets?.length ?? 0} set{sets?.length === 1 ? '' : 's'} logged
            {targetLine ? ` · ${targetLine}` : ''}
            {sessionExercise.targetRIRRange ? ` @${sessionExercise.targetRIRRange.min}-${sessionExercise.targetRIRRange.max} RIR` : ''}
          </p>
        </div>
        <span className="text-text-dim">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {suggestion && (
            <div className={`rounded-lg px-3 py-2 text-sm ${isDeloadWeek ? 'bg-warn/10 text-warn' : 'bg-accent/10 text-accent'}`}>
              {suggestion.suggestedWeight !== null ? (
                <button
                  className="font-medium underline decoration-dotted"
                  onClick={() => setWeight(String(suggestion.suggestedWeight))}
                >
                  Suggested: {suggestion.suggestedWeight} {suggestion.lastSession ? `(last: ${suggestion.lastSession.weight}×${suggestion.lastSession.reps}${suggestion.lastSession.rir !== null ? ` @${suggestion.lastSession.rir}RIR` : ''})` : ''}
                </button>
              ) : (
                <span>{suggestion.reasonLabel}</span>
              )}
              {suggestion.suggestedWeight !== null && <p className="text-xs opacity-80 mt-0.5">{suggestion.reasonLabel} — tap to fill weight</p>}
            </div>
          )}

          {sets && sets.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {sets.map((s) => (
                <SetRow key={s.id} set={s} />
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-text-dim">Weight</span>
              <input inputMode="decimal" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-surface-2 border border-border rounded-lg px-2 py-2.5 text-center w-full" placeholder="lb" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-text-dim">Reps</span>
              <input inputMode="numeric" type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-surface-2 border border-border rounded-lg px-2 py-2.5 text-center w-full" placeholder="reps" />
            </div>
            <div className="flex flex-col gap-1 w-16">
              <span className="text-xs text-text-dim">RIR</span>
              <input inputMode="numeric" type="number" value={rir} onChange={(e) => setRir(e.target.value)} className="bg-surface-2 border border-border rounded-lg px-2 py-2.5 text-center w-full" placeholder="–" />
            </div>
            <Button onClick={logSet} size="md">Add</Button>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => setSessionExerciseStatus(sessionExercise.id, { skipped: !sessionExercise.skipped, completed: false })}
            >
              {sessionExercise.skipped ? 'Unskip' : 'Skip this exercise'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SetRow({ set }: { set: { id: string; setNumber: number; weight: number; reps: number; rir: number | null } }) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(String(set.weight))
  const [reps, setReps] = useState(String(set.reps))
  const [rir, setRir] = useState(set.rir === null ? '' : String(set.rir))

  async function save() {
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (Number.isNaN(w) || Number.isNaN(r)) return
    const rirVal = rir.trim() === '' ? null : parseInt(rir, 10)
    await updateSet(set.id, { weight: w, reps: r, rir: Number.isNaN(rirVal as number) ? null : rirVal })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex gap-1.5 items-center bg-surface-2 rounded-lg px-2 py-1.5">
        <span className="text-xs text-text-dim w-4">{set.setNumber}</span>
        <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-surface border border-border rounded px-1.5 py-1 w-16 text-center text-sm" />
        <span className="text-text-dim text-xs">×</span>
        <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-surface border border-border rounded px-1.5 py-1 w-14 text-center text-sm" />
        <input type="number" value={rir} onChange={(e) => setRir(e.target.value)} placeholder="RIR" className="bg-surface border border-border rounded px-1.5 py-1 w-14 text-center text-sm" />
        <button onClick={save} className="text-accent text-sm font-medium px-1.5">✓</button>
        <button onClick={() => deleteSet(set.id)} className="text-danger text-sm px-1.5">✕</button>
      </div>
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-1.5 text-sm text-left hover:border-accent border border-transparent">
      <span className="text-text-dim w-4">{set.setNumber}</span>
      <span className="font-medium">{set.weight} × {set.reps}</span>
      {set.rir !== null && <span className="text-text-dim">@{set.rir} RIR</span>}
      <span className="ml-auto text-text-dim text-xs">edit</span>
    </button>
  )
}
