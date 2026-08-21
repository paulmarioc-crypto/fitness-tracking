import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { db } from '../db/schema'
import { updateExercise, archiveExercise } from '../db/queries'
import { getExerciseTrend, type ExerciseTrendPoint } from '../lib/analytics'
import { toEmbedUrl } from '../lib/video'
import { fmtDate } from '../lib/dates'
import { Shell } from '../components/layout/Shell'
import { Card, Button, Badge, TextField, EmptyState } from '../components/ui'
import { ExerciseMediaUploader } from '../components/ExerciseMediaUploader'

export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const exercise = useLiveQuery(() => (id ? db.exercises.get(id) : undefined), [id])
  const [editing, setEditing] = useState(false)
  const [trend, setTrend] = useState<ExerciseTrendPoint[]>([])

  useEffect(() => {
    if (id) getExerciseTrend(id).then(setTrend)
  }, [id])

  if (!exercise) {
    return (
      <Shell title="Exercise">
        <EmptyState title="Loading…" />
      </Shell>
    )
  }

  const embedUrl = exercise.videoUrl ? toEmbedUrl(exercise.videoUrl) : null
  const chartData = trend.map((p) => ({ date: fmtDate(p.date), topWeight: p.topWeight, volume: Math.round(p.totalVolume), accuracy: p.accuracy }))
  const hasAccuracy = chartData.some((p) => p.accuracy !== null)

  return (
    <Shell title={exercise.name}>
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate(-1)}>← Back</Button>

        {embedUrl && (
          <div className="rounded-xl overflow-hidden aspect-video bg-black">
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={`${exercise.name} demo`} />
          </div>
        )}
        {exercise.videoUrl && !embedUrl && (
          <a href={exercise.videoUrl} target="_blank" rel="noreferrer" className="text-accent underline text-sm">Watch demo video ↗</a>
        )}

        <ExerciseMediaUploader exerciseId={exercise.id} />

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="capitalize text-text-dim text-sm">{exercise.category}{exercise.notes ? ` · ${exercise.notes}` : ''}</p>
            <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>{editing ? 'Cancel' : 'Edit'}</Button>
          </div>
          {exercise.targetRepRange && (
            <p className="text-sm">Target reps: {exercise.targetRepRange.min}–{exercise.targetRepRange.max}</p>
          )}
          {exercise.targetRIRRange && (
            <p className="text-sm">Target RIR: {exercise.targetRIRRange.min}–{exercise.targetRIRRange.max}</p>
          )}
          {exercise.instructions && <p className="text-sm text-text-dim mt-2 whitespace-pre-wrap">{exercise.instructions}</p>}
        </Card>

        {editing && <EditForm exercise={exercise} onDone={() => setEditing(false)} />}

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Top set weight &amp; accuracy over time</h2>
          {chartData.length === 0 ? (
            <EmptyState title="No data yet" hint="Log a set to start tracking progress." />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="date" stroke="#8b98a5" fontSize={11} />
                  <YAxis yAxisId="weight" stroke="#8b98a5" fontSize={11} width={32} />
                  {hasAccuracy && <YAxis yAxisId="accuracy" orientation="right" stroke="#8b98a5" fontSize={11} width={32} domain={[0, 100]} />}
                  <Tooltip contentStyle={{ background: '#1a222b', border: '1px solid #232c37', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="weight" type="monotone" dataKey="topWeight" stroke="#4fd1a5" strokeWidth={2} dot={{ r: 3 }} name="Top set weight" />
                  {hasAccuracy && (
                    <Line yAxisId="accuracy" type="monotone" dataKey="accuracy" stroke="#f2b84b" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} name="Accuracy %" connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Session history</h2>
          <div className="flex flex-col gap-2">
            {trend.slice().reverse().map((p) => (
              <Card key={p.date}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{fmtDate(p.date, 'EEE, MMM d')}</p>
                  {p.accuracy !== null && (
                    <Badge tone={p.accuracy >= 80 ? 'accent' : p.accuracy >= 50 ? 'warn' : 'danger'}>{p.accuracy}% accurate</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.sets.map((s) => (
                    <span key={s.id} className="text-xs bg-surface-2 rounded-md px-2 py-1">
                      {s.weight}×{s.reps}{s.rir !== null ? ` @${s.rir}RIR` : ''}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Button variant="danger" size="sm" onClick={() => archiveExercise(exercise.id).then(() => navigate('/exercises'))}>Archive exercise</Button>
      </div>
    </Shell>
  )
}

function EditForm({
  exercise,
  onDone,
}: {
  exercise: { id: string; name: string; videoUrl?: string; instructions?: string; targetRepRange?: { min: number; max: number } }
  onDone: () => void
}) {
  const [name, setName] = useState(exercise.name)
  const [videoUrl, setVideoUrl] = useState(exercise.videoUrl ?? '')
  const [instructions, setInstructions] = useState(exercise.instructions ?? '')
  const [repMin, setRepMin] = useState(exercise.targetRepRange?.min ?? 8)
  const [repMax, setRepMax] = useState(exercise.targetRepRange?.max ?? 12)

  async function save() {
    await updateExercise(exercise.id, { name, videoUrl: videoUrl || undefined, instructions: instructions || undefined, targetRepRange: { min: repMin, max: repMax } })
    onDone()
  }

  return (
    <Card className="flex flex-col gap-3">
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="YouTube video URL (optional)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
      <label className="flex flex-col gap-1">
        <span className="text-xs text-text-dim">How to execute (optional)</span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Step-by-step cues, setup notes, common mistakes to avoid…"
          className="bg-surface-2 border border-border rounded-lg px-3 py-2 w-full text-sm resize-none"
          rows={4}
        />
      </label>
      <div className="flex gap-2">
        <TextField label="Rep min" type="number" value={repMin} onChange={(e) => setRepMin(Number(e.target.value))} />
        <TextField label="Rep max" type="number" value={repMax} onChange={(e) => setRepMax(Number(e.target.value))} />
      </div>
      <Button onClick={save}>Save changes</Button>
    </Card>
  )
}
