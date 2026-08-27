import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { updateTemplateExercises, makeTemplateExercise } from '../db/queries'
import { Card, Button, NumberField } from './ui'
import type { DayTemplate, DayTemplateExercise } from '../types'

/**
 * Edits the prescription itself — sets, reps, RIR, load basis, which
 * exercises and in what order. Changes only affect future sessions, since
 * a session snapshots its targets when it starts.
 */
export function TemplateEditor({ template, onDone }: { template: DayTemplate; onDone: () => void }) {
  const allExercises = useLiveQuery(() => db.exercises.filter((e) => !e.archived).toArray(), [])
  const [rows, setRows] = useState<DayTemplateExercise[]>(() => template.exercises.slice().sort((a, b) => a.order - b.order))
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const exerciseById = new Map((allExercises ?? []).map((e) => [e.id, e]))
  const sortedLibrary = (allExercises ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))

  function patch(id: string, changes: Partial<DayTemplateExercise>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  }

  function move(index: number, delta: number) {
    setRows((prev) => {
      const next = prev.slice()
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function save() {
    setSaving(true)
    await updateTemplateExercises(template.id, rows)
    setSaving(false)
    onDone()
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="py-3 border-accent/40 bg-accent/5">
        <p className="text-sm text-text-dim">
          Change sets, reps, RIR or swap exercises. Anything you add starts getting weight suggestions from its own history straight away. Edits apply
          to future sessions — already-logged ones keep what they were done with.
        </p>
      </Card>

      {rows.map((row, idx) => {
        const ex = exerciseById.get(row.exerciseId)
        const isPercent = row.loadBasis === 'percent_of_max'
        return (
          <Card key={row.id} className="flex flex-col gap-2.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <select
                value={row.exerciseId}
                onChange={(e) => {
                  const picked = exerciseById.get(e.target.value)
                  patch(row.id, { exerciseId: e.target.value, focus: picked?.notes })
                }}
                className="bg-surface-2 border border-border rounded-lg px-2 py-2 text-sm flex-1 min-w-0"
              >
                {sortedLibrary.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="px-2 py-2 text-text-dim disabled:opacity-30">↑</button>
                <button onClick={() => move(idx, 1)} disabled={idx === rows.length - 1} className="px-2 py-2 text-text-dim disabled:opacity-30">↓</button>
                <button onClick={() => setRows((p) => p.filter((r) => r.id !== row.id))} className="px-2 py-2 text-danger">✕</button>
              </div>
            </div>

            <div className="flex gap-2">
              <NumberField
                label="Sets"
                value={row.targetSets}
                min={1}
                onChange={(e) => patch(row.id, { targetSets: Math.max(1, Number(e.target.value) || 1) })}
                className="flex-1"
              />
              <NumberField
                label="Reps min"
                value={row.targetRepRange?.min ?? ''}
                onChange={(e) =>
                  patch(row.id, { targetRepRange: { min: Number(e.target.value) || 0, max: row.targetRepRange?.max ?? 0 } })
                }
                className="flex-1"
              />
              <NumberField
                label="Reps max"
                value={row.targetRepRange?.max ?? ''}
                onChange={(e) =>
                  patch(row.id, { targetRepRange: { min: row.targetRepRange?.min ?? 0, max: Number(e.target.value) || 0 } })
                }
                className="flex-1"
              />
            </div>

            <div className="flex gap-2">
              <NumberField
                label="RIR min"
                value={row.targetRIRRange?.min ?? ''}
                onChange={(e) => patch(row.id, { targetRIRRange: { min: Number(e.target.value) || 0, max: row.targetRIRRange?.max ?? 0 } })}
                className="flex-1"
              />
              <NumberField
                label="RIR max"
                value={row.targetRIRRange?.max ?? ''}
                onChange={(e) => patch(row.id, { targetRIRRange: { min: row.targetRIRRange?.min ?? 0, max: Number(e.target.value) || 0 } })}
                className="flex-1"
              />
              {isPercent && (
                <NumberField
                  label="% of max"
                  value={Math.round((row.percentOfMax ?? 0.8) * 100)}
                  onChange={(e) => patch(row.id, { percentOfMax: Math.min(100, Math.max(1, Number(e.target.value) || 80)) / 100 })}
                  className="flex-1"
                />
              )}
            </div>

            <button
              onClick={() =>
                patch(row.id, {
                  loadBasis: isPercent ? 'double_progression' : 'percent_of_max',
                  percentOfMax: isPercent ? undefined : (row.percentOfMax ?? 0.8),
                  // A percentage-based prescription that also carries the plan's
                  // literal "3 × 8–10" text would contradict itself.
                  prescriptionLabel: undefined,
                })
              }
              className={`text-xs px-2.5 py-1.5 rounded-lg self-start border transition ${
                isPercent ? 'bg-warn/15 border-warn/40 text-warn' : 'bg-surface-2 border-border text-text-dim'
              }`}
            >
              {isPercent ? `Heavy: ${Math.round((row.percentOfMax ?? 0.8) * 100)}% of max — tap for normal progression` : 'Normal progression — tap for % of max'}
            </button>

            {!ex && <p className="text-xs text-danger">This exercise is missing from your library.</p>}
          </Card>
        )
      })}

      {adding ? (
        <Card className="max-h-64 overflow-y-auto flex flex-col gap-1">
          {sortedLibrary.map((o) => (
            <button
              key={o.id}
              className="text-left px-2 py-2 rounded-lg hover:bg-surface-2 text-sm"
              onClick={() => {
                setRows((p) => [...p, makeTemplateExercise(o.id, o)])
                setAdding(false)
              }}
            >
              {o.name}
            </button>
          ))}
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>+ Add exercise</Button>
      )}

      <div className="flex gap-2">
        <Button className="flex-1" onClick={save} disabled={saving || rows.length === 0}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  )
}
