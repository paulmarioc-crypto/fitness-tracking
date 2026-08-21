import { useSearchParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { completeSession, addSessionExercise } from '../db/queries'
import { Shell } from '../components/layout/Shell'
import { Card, Button, EmptyState, Badge } from '../components/ui'
import { SessionExerciseCard } from '../components/SessionExerciseCard'
import { CrossTrainingForm } from '../components/CrossTrainingForm'
import { SleepForm } from '../components/SleepForm'
import { fmtDate } from '../lib/dates'
import { useState } from 'react'
import type { CrossTrainingType } from '../types'

type Tab = 'gym' | CrossTrainingType | 'sleep'

export function Train() {
  const [params, setParams] = useSearchParams()
  const sessionId = params.get('session')

  if (sessionId) return <SessionView sessionId={sessionId} />

  const tab = (params.get('tab') as Tab) ?? 'gym'

  const TABS: { value: Tab; label: string }[] = [
    { value: 'gym', label: 'Gym' },
    { value: 'bike', label: 'Bike' },
    { value: 'soccer', label: 'Soccer' },
    { value: 'volleyball', label: 'V-ball' },
    { value: 'sleep', label: 'Sleep' },
  ]

  return (
    <Shell title="Train">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-5 gap-1 bg-surface-2 rounded-xl p-1 border border-border">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setParams({ tab: t.value })}
              className={`px-1 py-2 rounded-lg text-xs font-medium transition ${tab === t.value ? 'bg-accent text-black' : 'text-text-dim hover:text-text'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'gym' && <ResumeSessions />}
        {tab === 'sleep' && <SleepForm />}
        {(tab === 'bike' || tab === 'soccer' || tab === 'volleyball') && <CrossTrainingForm type={tab} />}
      </div>
    </Shell>
  )
}

function ResumeSessions() {
  const navigate = useNavigate()
  const inProgress = useLiveQuery(() => db.sessions.where('status').equals('in_progress').toArray(), [])

  return (
    <div className="flex flex-col gap-3">
      {inProgress && inProgress.length > 0 ? (
        <>
          <h2 className="text-sm font-semibold text-text-dim uppercase tracking-wide">In progress</h2>
          {inProgress.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:border-accent" onClick={() => navigate(`/train?session=${s.id}`)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.dayTypeName}</p>
                  <p className="text-xs text-text-dim">{fmtDate(s.date, 'EEE, MMM d')}</p>
                </div>
                <Badge>Resume →</Badge>
              </div>
            </Card>
          ))}
        </>
      ) : (
        <EmptyState title="No session in progress" hint="Start one from the Today tab." />
      )}
      <Button variant="secondary" onClick={() => navigate('/')}>Go to Today</Button>
    </div>
  )
}

function SessionView({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate()
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId])
  const sessionExercises = useLiveQuery(() => db.sessionExercises.where({ sessionId }).sortBy('order'), [sessionId])
  const allExercises = useLiveQuery(() => db.exercises.filter((e) => !e.archived).toArray(), [])
  const [showAdd, setShowAdd] = useState(false)

  if (!session) return null

  const usedIds = new Set((sessionExercises ?? []).map((se) => se.exerciseId))
  const available = (allExercises ?? []).filter((e) => !usedIds.has(e.id))

  async function finish() {
    await completeSession(sessionId)
    navigate('/')
  }

  return (
    <Shell title={session.dayTypeName}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-text-dim text-sm">{fmtDate(session.date, 'EEEE, MMM d')}</p>
          <div className="flex gap-1.5">
            {session.isDeloadWeek && <Badge tone="warn">Deload</Badge>}
            <Badge tone={session.status === 'completed' ? 'accent' : 'default'}>{session.status.replace('_', ' ')}</Badge>
          </div>
        </div>

        {(sessionExercises ?? []).map((se) => (
          <SessionExerciseCard key={se.id} sessionExercise={se} isDeloadWeek={session.isDeloadWeek ?? false} />
        ))}

        <Button variant="secondary" onClick={() => setShowAdd((v) => !v)}>{showAdd ? 'Cancel' : '+ Add exercise'}</Button>
        {showAdd && (
          <Card className="max-h-64 overflow-y-auto flex flex-col gap-1">
            {available.map((ex) => (
              <button
                key={ex.id}
                className="text-left px-2 py-2 rounded-lg hover:bg-surface-2 text-sm"
                onClick={async () => {
                  await addSessionExercise(sessionId, ex.id)
                  setShowAdd(false)
                }}
              >
                {ex.name}
              </button>
            ))}
          </Card>
        )}

        {session.status !== 'completed' && (
          <Button size="lg" onClick={finish}>Finish session</Button>
        )}
      </div>
    </Shell>
  )
}
