import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { addExercise } from '../db/queries'
import { Shell } from '../components/layout/Shell'
import { Card, Button, TextField, SegmentedControl, EmptyState } from '../components/ui'
import type { ExerciseCategory } from '../types'

const CATEGORY_COLOR: Record<ExerciseCategory, string> = {
  upper: 'text-upper',
  lower: 'text-lower',
  mobility: 'text-mobility',
  core: 'text-core',
}

export function Exercises() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | ExerciseCategory>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  const exercises = useLiveQuery(() => db.exercises.filter((e) => !e.archived).toArray(), [])
  const mediaExerciseIds = useLiveQuery(() => db.exerciseMedia.toCollection().primaryKeys(), [])
  const hasMedia = new Set(mediaExerciseIds ?? [])

  const filtered = (exercises ?? [])
    .filter((e) => filter === 'all' || e.category === filter)
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Shell title="Exercises">
      <div className="flex flex-col gap-3">
        <TextField placeholder="Search exercises…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'upper', label: 'Upper' },
            { value: 'lower', label: 'Lower' },
            { value: 'mobility', label: 'Mobility' },
          ]}
        />

        <Button variant="secondary" onClick={() => setShowAdd((v) => !v)}>{showAdd ? 'Cancel' : '+ Add exercise'}</Button>
        {showAdd && <AddExerciseForm onDone={() => setShowAdd(false)} />}

        {filtered.length === 0 ? (
          <EmptyState title="No exercises found" hint="Try a different filter or add a new one." />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((ex) => (
              <Card key={ex.id} className="cursor-pointer hover:border-accent transition" onClick={() => navigate(`/exercises/${ex.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{ex.name}</p>
                    <p className={`text-xs ${CATEGORY_COLOR[ex.category]} capitalize`}>{ex.category}{ex.notes ? ` · ${ex.notes}` : ''}</p>
                  </div>
                  <div className="flex gap-1 text-text-dim text-sm">
                    {ex.videoUrl && <span title="Has video link">▶</span>}
                    {hasMedia.has(ex.id) && <span title="Has uploaded GIF/photo/video">🖼</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

function AddExerciseForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ExerciseCategory>('upper')
  const [videoUrl, setVideoUrl] = useState('')

  async function submit() {
    if (!name.trim()) return
    await addExercise({ name: name.trim(), category, videoUrl: videoUrl.trim() || undefined })
    onDone()
  }

  return (
    <Card className="flex flex-col gap-3">
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cable lateral raise" />
      <SegmentedControl
        value={category}
        onChange={setCategory}
        options={[
          { value: 'upper', label: 'Upper' },
          { value: 'lower', label: 'Lower' },
          { value: 'mobility', label: 'Mobility' },
          { value: 'core', label: 'Core' },
        ]}
      />
      <TextField label="Instructional video URL (optional)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube link" />
      <Button onClick={submit}>Save exercise</Button>
    </Card>
  )
}
