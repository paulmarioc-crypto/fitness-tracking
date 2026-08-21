import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { startSession, todayStr, upsertHealthCheckin } from '../db/queries'
import { computeProgramWeek } from '../lib/program'
import { getSessionAccuracy } from '../lib/analytics'
import { Shell } from '../components/layout/Shell'
import { StreakBadge } from '../components/StreakBadge'
import { Card, Button, Badge } from '../components/ui'
import { getHealthFlagStatus } from '../lib/healthFlags'
import { useEffect } from 'react'
import type { HealthFlagStatus } from '../lib/healthFlags'
import type { SessionStatus } from '../types'

export function Today() {
  const navigate = useNavigate()
  const today = todayStr()

  const templates = useLiveQuery(() => db.dayTemplates.filter((t) => !t.archived).toArray(), [])
  const programSettings = useLiveQuery(() => db.programSettings.get('singleton'), [])
  const todaysSessions = useLiveQuery(() => db.sessions.where({ date: today }).toArray(), [today])
  const todaysCrossTraining = useLiveQuery(() => db.crossTraining.where({ date: today }).toArray(), [today])
  const todaysCheckin = useLiveQuery(() => db.healthCheckins.where({ date: today }).first(), [today])
  const todaysSleep = useLiveQuery(() => db.sleep.where({ date: today }).first(), [today])

  const programWeek = computeProgramWeek(programSettings?.startDate ?? null, today)
  // Default to Block 1 until a program start date is set, so the app stays usable.
  const currentBlock = programWeek.block ?? 1
  const blockTemplates = (templates ?? []).filter((t) => t.block === currentBlock)

  const [flags, setFlags] = useState<HealthFlagStatus>()
  useEffect(() => {
    getHealthFlagStatus().then(setFlags)
  }, [todaysCheckin])

  async function handleStart(templateId: string, name: string) {
    const template = await db.dayTemplates.get(templateId)
    const session = await startSession(template ?? null, name, today, programWeek.isDeloadWeek)
    navigate(`/train?session=${session.id}`)
  }

  return (
    <Shell title="Today">
      <div className="flex flex-col gap-4">
        <StreakBadge />

        {programWeek.week ? (
          <Card className={programWeek.isDeloadWeek ? 'border-warn/50 bg-warn/10' : ''}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Week {programWeek.week} of 12 · Block {currentBlock}
                  {programWeek.pastProgram && ' (past program)'}
                </p>
                <p className="text-sm text-text-dim">{programWeek.blockLabel}</p>
              </div>
              {programWeek.isDeloadWeek && <Badge tone="warn">Deload week</Badge>}
            </div>
            {programWeek.isDeloadWeek && (
              <p className="text-sm text-text-dim mt-2">Sets are trimmed ~25–30% automatically. Keep movement quality high.</p>
            )}
          </Card>
        ) : (
          <Card className="cursor-pointer hover:border-accent" onClick={() => navigate('/more/settings')}>
            <p className="text-sm">
              <span className="text-accent font-medium">Set your program start date</span> in Settings to track week/block and get deload-week
              suggestions.
            </p>
          </Card>
        )}

        {flags?.swellingAlert && (
          <Card className="border-danger/50 bg-danger/10">
            <p className="font-semibold text-danger">⚠ {flags.consecutiveSwellingDays} days in a row with knee/ankle swelling</p>
            <p className="text-sm text-text-dim mt-1">Consider dialing back reactive/cutting work. Not something to train through.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate('/more/health')}>View details</Button>
          </Card>
        )}
        {flags?.givingWayAlert && !flags.swellingAlert && (
          <Card className="border-warn/50 bg-warn/10">
            <p className="font-semibold text-warn">Giving-way episode logged this week</p>
            <p className="text-sm text-text-dim mt-1">The plan flags this as a reason for clinical reassessment, not training through it.</p>
          </Card>
        )}

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Start a session</h2>
          <div className="grid grid-cols-2 gap-2">
            {blockTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleStart(t.id, t.name)}
                className="bg-surface border border-border rounded-xl p-3 text-left hover:border-accent transition"
              >
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-text-dim">{t.exercises.length} exercises</p>
              </button>
            ))}
            <button
              onClick={() => handleStart('', 'Custom session')}
              className="bg-surface border border-dashed border-border rounded-xl p-3 text-left hover:border-accent transition"
            >
              <p className="font-medium">+ Custom</p>
              <p className="text-xs text-text-dim">Pick exercises freely</p>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Log cross-training</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => navigate('/train?tab=bike')}>🚴 Bike</Button>
            <Button variant="secondary" onClick={() => navigate('/train?tab=soccer')}>⚽ Soccer</Button>
            <Button variant="secondary" onClick={() => navigate('/train?tab=volleyball')}>🏐 Volleyball</Button>
            <Button variant="secondary" onClick={() => navigate('/train?tab=hiking')}>🥾 Hiking</Button>
            <Button variant="secondary" className="col-span-2" onClick={() => navigate('/train?tab=sleep')}>😴 Sleep</Button>
          </div>
        </div>

        <QuickCheckin defaultDate={today} />

        {(todaysSessions?.length || todaysCrossTraining?.length || todaysSleep) ? (
          <div>
            <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Logged today</h2>
            <div className="flex flex-col gap-2">
              {todaysSessions?.map((s) => (
                <SessionLogCard key={s.id} sessionId={s.id} dayTypeName={s.dayTypeName} status={s.status} />
              ))}
              {todaysCrossTraining?.map((c) => (
                <Card key={c.id} className="flex items-center justify-between py-2.5">
                  <span className="capitalize">{c.type}</span>
                  <span className="text-sm text-text-dim">{c.durationMin} min</span>
                </Card>
              ))}
              {todaysSleep && (
                <Card className="flex items-center justify-between py-2.5">
                  <span>😴 Sleep</span>
                  <span className="text-sm text-text-dim">
                    {Math.floor(todaysSleep.sleepDurationMin / 60)}h {todaysSleep.sleepDurationMin % 60}m
                    {todaysSleep.hrv !== undefined ? ` · HRV ${todaysSleep.hrv}` : ''}
                    {todaysSleep.restingHR !== undefined ? ` · RHR ${todaysSleep.restingHR}` : ''}
                  </span>
                </Card>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Shell>
  )
}

function QuickCheckin({ defaultDate }: { defaultDate: string }) {
  const existing = useLiveQuery(() => db.healthCheckins.where({ date: defaultDate }).first(), [defaultDate])
  const [kneeSwelling, setKneeSwelling] = useState(false)
  const [ankleSwelling, setAnkleSwelling] = useState(false)
  const [givingWay, setGivingWay] = useState(false)
  const [leftShinRating, setLeftShinRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (existing) {
      setKneeSwelling(existing.kneeSwelling)
      setAnkleSwelling(existing.ankleSwelling)
      setGivingWay(existing.givingWay)
      setLeftShinRating(existing.leftShinRating)
      setNotes(existing.fatigueNotes ?? '')
    }
  }, [existing])

  async function save() {
    await upsertHealthCheckin({ date: defaultDate, kneeSwelling, ankleSwelling, givingWay, leftShinRating, fatigueNotes: notes })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-text-dim mb-3 uppercase tracking-wide">Daily check-in</h2>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <ToggleButton label="Knee swelling" active={kneeSwelling} onClick={() => setKneeSwelling((v) => !v)} />
        <ToggleButton label="Ankle swelling" active={ankleSwelling} onClick={() => setAnkleSwelling((v) => !v)} />
        <ToggleButton label="Giving-way episode" active={givingWay} onClick={() => setGivingWay((v) => !v)} className="col-span-2" />
      </div>
      <label className="flex flex-col gap-1 mb-3">
        <span className="text-xs text-text-dim">Left shin symptom (0-10): {leftShinRating}</span>
        <input type="range" min={0} max={10} value={leftShinRating} onChange={(e) => setLeftShinRating(Number(e.target.value))} className="accent-[#4fd1a5]" />
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Fatigue / sleep notes (optional)"
        className="bg-surface-2 border border-border rounded-lg px-3 py-2 w-full text-sm mb-3 resize-none"
        rows={2}
      />
      <Button onClick={save} className="w-full">{saved ? 'Saved ✓' : existing ? 'Update check-in' : 'Save check-in'}</Button>
    </Card>
  )
}

function SessionLogCard({ sessionId, dayTypeName, status }: { sessionId: string; dayTypeName: string; status: SessionStatus }) {
  const accuracy = useLiveQuery(() => getSessionAccuracy(sessionId), [sessionId])
  const accuracyTone = accuracy == null ? 'default' : accuracy >= 80 ? 'accent' : accuracy >= 50 ? 'warn' : 'danger'

  return (
    <Card className="flex items-center justify-between py-2.5">
      <span>{dayTypeName}</span>
      <div className="flex gap-1.5">
        {accuracy != null && <Badge tone={accuracyTone}>{accuracy}% accurate</Badge>}
        <Badge tone={status === 'completed' ? 'accent' : 'default'}>{status.replace('_', ' ')}</Badge>
      </div>
    </Card>
  )
}

function ToggleButton({ label, active, onClick, className }: { label: string; active: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition ${active ? 'bg-danger/20 border-danger/50 text-danger' : 'bg-surface-2 border-border text-text-dim'} ${className ?? ''}`}
    >
      {active ? '● ' : '○ '}{label}
    </button>
  )
}
