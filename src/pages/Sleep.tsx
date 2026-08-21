import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { db } from '../db/schema'
import { todayStr } from '../db/queries'
import { getSleepTrend, type SleepPoint } from '../lib/analytics'
import { getReadiness, type ReadinessSignal } from '../lib/readiness'
import { fmtDate } from '../lib/dates'
import { Shell } from '../components/layout/Shell'
import { SleepForm } from '../components/SleepForm'
import { ReadinessCard } from '../components/ReadinessCard'
import { Card, EmptyState } from '../components/ui'

export function Sleep() {
  const entries = useLiveQuery(() => db.sleep.orderBy('date').reverse().toArray(), [])
  const [trend, setTrend] = useState<SleepPoint[]>([])
  const [readiness, setReadiness] = useState<ReadinessSignal>()

  useEffect(() => {
    getSleepTrend().then(setTrend)
    getReadiness(todayStr()).then(setReadiness)
  }, [entries])

  const chartData = trend.map((p) => ({ date: fmtDate(p.date), hours: p.sleepDurationHrs, hrv: p.hrv, restingHR: p.restingHR }))
  const hasRecoveryMetrics = chartData.some((p) => p.hrv !== undefined || p.restingHR !== undefined)

  return (
    <Shell title="Sleep">
      <div className="flex flex-col gap-4">
        {readiness && <ReadinessCard readiness={readiness} />}

        <Card className="py-3">
          <p className="text-sm text-text-dim">
            Sleep drives the load suggestions on your lifting days: a short night or a drop in HRV / rise in resting HR holds back a planned weight
            increase, and a clearly rough night eases the load slightly. It never pushes weight <em>above</em> what the plan's progression allows.
          </p>
        </Card>

        <SleepForm />

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Sleep duration</h2>
          {chartData.length === 0 ? (
            <EmptyState title="No sleep logged yet" hint="Log last night above to start building your baseline." />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="date" stroke="#8b98a5" fontSize={11} />
                  <YAxis stroke="#8b98a5" fontSize={11} width={28} />
                  <Tooltip contentStyle={{ background: '#1a222b', border: '1px solid #232c37', borderRadius: 8 }} />
                  <Bar dataKey="hours" fill="#6ea8fe" name="Sleep (hrs)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {hasRecoveryMetrics && (
          <div>
            <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">HRV &amp; resting HR</h2>
            <Card>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="date" stroke="#8b98a5" fontSize={11} />
                  <YAxis stroke="#8b98a5" fontSize={11} width={32} />
                  <Tooltip contentStyle={{ background: '#1a222b', border: '1px solid #232c37', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="hrv" stroke="#4fd1a5" strokeWidth={2} dot={{ r: 3 }} name="HRV (ms)" connectNulls />
                  <Line type="monotone" dataKey="restingHR" stroke="#f26d6d" strokeWidth={2} dot={{ r: 3 }} name="Resting HR" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {entries && entries.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Recent nights</h2>
            <div className="flex flex-col gap-2">
              {entries.slice(0, 14).map((e) => (
                <Card key={e.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm">{fmtDate(e.date, 'EEE, MMM d')}</span>
                  <span className="text-sm text-text-dim">
                    {Math.floor(e.sleepDurationMin / 60)}h {e.sleepDurationMin % 60}m
                    {e.hrv !== undefined ? ` · HRV ${e.hrv}` : ''}
                    {e.restingHR !== undefined ? ` · RHR ${e.restingHR}` : ''}
                  </span>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
