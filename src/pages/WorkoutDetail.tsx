import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { startSession, todayStr } from '../db/queries'
import { computeProgramWeek, deloadAdjustedSets } from '../lib/program'
import { getWeekRange, buildWeekWorkouts, slotForDayType } from '../lib/weekPlan'
import { getLoadSuggestion } from '../lib/progression'
import { fmtDate } from '../lib/dates'
import { Shell } from '../components/layout/Shell'
import { Card, Button, Badge, EmptyState } from '../components/ui'

interface PlannedExercise {
  id: string
  name: string
  category: string
  sets: number
  repsLabel: string
  rirLabel: string | null
  focus?: string
  suggestedWeight: number | null
  suggestionReason: string
}

export function WorkoutDetail() {
  const { dayType: rawDayType } = useParams<{ dayType: string }>()
  const dayType = decodeURIComponent(rawDayType ?? '')
  const navigate = useNavigate()
  const today = todayStr()

  const programSettings = useLiveQuery(() => db.programSettings.get('singleton'), [])
  const templates = useLiveQuery(() => db.dayTemplates.filter((t) => !t.archived).toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  const programWeek = computeProgramWeek(programSettings?.startDate ?? null, today)
  const block = programWeek.block ?? 1
  const range = getWeekRange(programSettings?.startDate ?? null, programWeek.week, today)

  const weekSessions = useLiveQuery(
    () => db.sessions.filter((s) => s.date >= range.start && s.date <= range.end).toArray(),
    [range.start, range.end]
  )

  const slot = slotForDayType(dayType)
  const template = (templates ?? []).find((t) => t.dayType === dayType && t.block === block) ?? null

  const weekWorkout = buildWeekWorkouts(templates ?? [], weekSessions ?? [], block, range).find((w) => w.slot.dayType === dayType)
  const status = weekWorkout?.status ?? 'not_started'
  const session = weekWorkout?.session ?? null

  const [planned, setPlanned] = useState<PlannedExercise[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!template || !exercises) return
      const byId = new Map(exercises.map((e) => [e.id, e]))
      const rows = await Promise.all(
        template.exercises
          .slice()
          .sort((a, b) => a.order - b.order)
          .map(async (te) => {
            const ex = byId.get(te.exerciseId)
            const sets = deloadAdjustedSets(te.targetSets, programWeek.isDeloadWeek)
            const suggestion = ex
              ? await getLoadSuggestion(te.exerciseId, ex.category, te.targetRepRange, te.targetRIRRange, sets, programWeek.isDeloadWeek)
              : null
            // prescriptionLabel carries the plan's exact wording (tempo notes,
            // "/ leg", holds); strip its leading "N ×" so the deload-adjusted
            // set count stays the single source of truth.
            const repsLabel = te.prescriptionLabel
              ? te.prescriptionLabel.replace(/^\s*\d+(–\d+)?\s*×\s*/, '')
              : te.targetRepRange
                ? `${te.targetRepRange.min}–${te.targetRepRange.max}`
                : '—'
            return {
              id: te.id,
              name: ex?.name ?? 'Unknown exercise',
              category: ex?.category ?? '',
              sets,
              repsLabel,
              rirLabel: te.targetRIRRange ? `${te.targetRIRRange.min}–${te.targetRIRRange.max}` : null,
              focus: te.focus,
              suggestedWeight: suggestion?.suggestedWeight ?? null,
              suggestionReason: suggestion?.reasonLabel ?? '',
            } satisfies PlannedExercise
          })
      )
      if (!cancelled) setPlanned(rows)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [template, exercises, programWeek.isDeloadWeek])

  if (!templates) return null

  if (!template) {
    return (
      <Shell title={dayType || 'Workout'}>
        <Button variant="ghost" size="sm" className="self-start mb-3" onClick={() => navigate('/')}>← Back</Button>
        <EmptyState title="Workout not found" hint={`No "${dayType}" template exists for Block ${block}.`} />
      </Shell>
    )
  }

  async function handleStart() {
    if (session && session.status !== 'completed') {
      navigate(`/train?session=${session.id}`)
      return
    }
    const created = await startSession(template!, dayType, today, programWeek.isDeloadWeek)
    navigate(`/train?session=${created.id}`)
  }

  const title = slot ? `Workout ${slot.index} · ${dayType}` : dayType

  return (
    <Shell title={title}>
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate('/')}>← Back</Button>

        <Card className={programWeek.isDeloadWeek ? 'border-warn/50 bg-warn/10' : ''}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {programWeek.week ? `Week ${programWeek.week} of 12 · ` : ''}Block {block}
                {slot ? ` · ${slot.weekday}` : ''}
              </p>
              <p className="text-sm text-text-dim">{template.blockLabel}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={status} />
              {programWeek.isDeloadWeek && <Badge tone="warn">Deload</Badge>}
            </div>
          </div>
          {programWeek.isDeloadWeek && (
            <p className="text-sm text-text-dim mt-2">Deload week — set counts below are already reduced ~25–30%. Keep quality high.</p>
          )}
          {status === 'completed' && session && (
            <p className="text-sm text-text-dim mt-2">Completed {fmtDate(session.date, 'EEE, MMM d')}.</p>
          )}
        </Card>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">
            What to do — {planned.length} exercises
          </h2>
          <div className="flex flex-col gap-2">
            {planned.map((p, idx) => (
              <Card key={p.id} className="py-3">
                <div className="flex items-start gap-3">
                  <span className="text-text-dim text-sm font-medium w-5 shrink-0 pt-0.5">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{p.name}</p>
                    <p className="text-lg font-semibold text-accent mt-0.5 leading-tight">
                      {p.sets} × {p.repsLabel}
                    </p>
                    <p className="text-xs text-text-dim mt-0.5">
                      {p.rirLabel ? `Leave ${p.rirLabel} reps in reserve` : 'RIR not specified'}
                      {p.focus ? ` · ${p.focus}` : ''}
                    </p>
                    {p.suggestedWeight !== null ? (
                      <p className="text-xs text-warn mt-1">Suggested load: {p.suggestedWeight} lb — {p.suggestionReason}</p>
                    ) : (
                      <p className="text-xs text-text-dim mt-1">{p.suggestionReason}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Button size="lg" onClick={handleStart}>
          {status === 'in_progress' ? 'Resume workout' : status === 'completed' ? 'Do this workout again' : 'Start workout'}
        </Button>

        {status === 'completed' && session && (
          <Button variant="secondary" onClick={() => navigate(`/train?session=${session.id}`)}>
            Review logged sets
          </Button>
        )}
      </div>
    </Shell>
  )
}

function StatusBadge({ status }: { status: 'not_started' | 'in_progress' | 'completed' }) {
  if (status === 'completed') return <Badge tone="accent">Completed</Badge>
  if (status === 'in_progress') return <Badge>In progress</Badge>
  return <Badge>Not started</Badge>
}
