import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { db } from '../db/schema'
import { addBodyWeight, todayStr } from '../db/queries'
import {
  getWeeklyVolume,
  getBodyWeightTrend,
  getAdherence,
  getWeeklyAccuracyTrend,
  type WeeklyVolumePoint,
  type BodyWeightPoint,
  type AdherencePoint,
  type WeeklyAccuracyPoint,
} from '../lib/analytics'
import { fmtDate } from '../lib/dates'
import { Shell } from '../components/layout/Shell'
import { Card, Button, NumberField, EmptyState } from '../components/ui'

const DAY_TYPE_COLORS = ['#6ea8fe', '#4fd1a5', '#c792ea', '#f2b84b', '#f26d6d', '#8b98a5']

export function Progress() {
  const navigate = useNavigate()
  const exercises = useLiveQuery(() => db.exercises.filter((e) => !e.archived).toArray(), [])
  const bodyWeightEntries = useLiveQuery(() => db.bodyWeight.toArray(), [])

  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumePoint[]>([])
  const [bodyWeightTrend, setBodyWeightTrend] = useState<BodyWeightPoint[]>([])
  const [adherence, setAdherence] = useState<AdherencePoint[]>([])
  const [accuracyTrend, setAccuracyTrend] = useState<WeeklyAccuracyPoint[]>([])
  const setsCount = useLiveQuery(() => db.sets.count(), [])

  useEffect(() => {
    getWeeklyVolume().then(setWeeklyVolume)
    getBodyWeightTrend().then(setBodyWeightTrend)
    getAdherence().then(setAdherence)
  }, [bodyWeightEntries])

  useEffect(() => {
    getWeeklyAccuracyTrend().then(setAccuracyTrend)
  }, [setsCount])

  const dayTypes = [...new Set(weeklyVolume.flatMap((w) => Object.keys(w.byDayType)))]
  const volumeChartData = weeklyVolume.map((w) => ({ week: fmtDate(w.week), ...w.byDayType }))
  const bwChartData = bodyWeightTrend.map((p) => ({ date: fmtDate(p.date), weight: p.weightLb, rollingAvg: Math.round(p.rollingAvg * 10) / 10 }))
  const adherenceChartData = adherence.map((a) => ({
    week: fmtDate(a.week),
    completed: a.completedExercises,
    skipped: a.skippedExercises,
    planned: a.plannedExercises,
  }))
  const accuracyChartData = accuracyTrend.filter((p) => p.accuracy !== null).map((p) => ({ week: fmtDate(p.week), accuracy: p.accuracy }))

  return (
    <Shell title="Progress">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Exercise trends</h2>
          {exercises && exercises.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {exercises.slice(0, 8).map((ex) => (
                <button key={ex.id} onClick={() => navigate(`/exercises/${ex.id}`)} className="bg-surface border border-border rounded-xl p-3 text-left hover:border-accent text-sm">
                  {ex.name}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No exercises yet" />
          )}
          <p className="text-xs text-text-dim mt-2">Tap an exercise to see its weight/reps/RIR trend.</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Weekly volume by day-type</h2>
          {volumeChartData.length === 0 ? (
            <EmptyState title="No sessions logged yet" />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={volumeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="week" stroke="#8b98a5" fontSize={11} />
                  <YAxis stroke="#8b98a5" fontSize={11} width={40} />
                  <Tooltip contentStyle={{ background: '#1a222b', border: '1px solid #232c37', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {dayTypes.map((dt, i) => (
                    <Bar key={dt} dataKey={dt} stackId="a" fill={DAY_TYPE_COLORS[i % DAY_TYPE_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Adherence — planned vs completed</h2>
          {adherenceChartData.length === 0 ? (
            <EmptyState title="No sessions logged yet" />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={adherenceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="week" stroke="#8b98a5" fontSize={11} />
                  <YAxis stroke="#8b98a5" fontSize={11} width={30} />
                  <Tooltip contentStyle={{ background: '#1a222b', border: '1px solid #232c37', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="completed" stackId="a" fill="#4fd1a5" />
                  <Bar dataKey="skipped" stackId="a" fill="#f26d6d" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Prescription accuracy</h2>
          <p className="text-xs text-text-dim mb-2">
            How closely logged sets matched the target reps and suggested weight — the plan's own progression/deload rules, not just "did you show up."
          </p>
          {accuracyChartData.length === 0 ? (
            <EmptyState title="No scored sets yet" hint="Scores start once an exercise has a prior session to suggest a weight from." />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={accuracyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="week" stroke="#8b98a5" fontSize={11} />
                  <YAxis stroke="#8b98a5" fontSize={11} width={30} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#1a222b', border: '1px solid #232c37', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="accuracy" stroke="#f2b84b" strokeWidth={2} dot={{ r: 3 }} name="Accuracy %" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Body weight (rolling 7-day avg)</h2>
          {bwChartData.length > 0 && (
            <Card className="mb-2">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={bwChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="date" stroke="#8b98a5" fontSize={11} />
                  <YAxis stroke="#8b98a5" fontSize={11} width={36} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip contentStyle={{ background: '#1a222b', border: '1px solid #232c37', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="weight" stroke="#8b98a5" strokeWidth={1} dot={{ r: 2 }} name="Logged" />
                  <Line type="monotone" dataKey="rollingAvg" stroke="#4fd1a5" strokeWidth={2} dot={false} name="7-day avg" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
          <LogWeightForm />
        </div>

      </div>
    </Shell>
  )
}

function LogWeightForm() {
  const [weight, setWeight] = useState('')
  const [saved, setSaved] = useState(false)

  async function submit() {
    const w = parseFloat(weight)
    if (Number.isNaN(w)) return
    await addBodyWeight({ date: todayStr(), weightLb: w, source: 'manual' })
    setWeight('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  return (
    <Card className="flex gap-2 items-end">
      <NumberField label="Body weight (lb)" value={weight} onChange={(e) => setWeight(e.target.value)} className="flex-1" />
      <Button onClick={submit}>{saved ? 'Logged ✓' : 'Log weight'}</Button>
    </Card>
  )
}
