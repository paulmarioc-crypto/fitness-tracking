import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getHealthFlagStatus, type HealthFlagStatus } from '../lib/healthFlags'
import { fmtDate } from '../lib/dates'
import { Shell } from '../components/layout/Shell'
import { Card, Badge, EmptyState } from '../components/ui'

export function HealthFlags() {
  const [status, setStatus] = useState<HealthFlagStatus>()

  useEffect(() => {
    getHealthFlagStatus().then(setStatus)
  }, [])

  if (!status) return null

  const shinData = status.recent.map((c) => ({ date: fmtDate(c.date), shin: c.leftShinRating }))

  return (
    <Shell title="Health Flags">
      <div className="flex flex-col gap-4">
        {status.swellingAlert && (
          <Card className="border-danger/50 bg-danger/10">
            <p className="font-semibold text-danger">⚠ {status.consecutiveSwellingDays} consecutive days with swelling</p>
            <p className="text-sm text-text-dim mt-1">
              Per the plan: pause or substantially reduce reactive/cutting work if the knee or ankle begins swelling. This is not something to progress through.
            </p>
          </Card>
        )}
        {status.givingWayAlert && (
          <Card className="border-warn/50 bg-warn/10">
            <p className="font-semibold text-warn">Giving-way episode in the last 7 days</p>
            <p className="text-sm text-text-dim mt-1">New episodes of giving-way/instability are a reason for clinical reassessment, not something to train through.</p>
          </Card>
        )}
        {status.shinTrendUp && (
          <Card className="border-warn/50 bg-warn/10">
            <p className="font-semibold text-warn">Left-shin symptoms trending up</p>
            <p className="text-sm text-text-dim mt-1">That side wasn't imaged — persistent or increasing left-shin pain deserves separate assessment.</p>
          </Card>
        )}
        {!status.swellingAlert && !status.givingWayAlert && !status.shinTrendUp && (
          <Card className="border-accent/40 bg-accent/10">
            <p className="font-semibold text-accent">No active flags</p>
            <p className="text-sm text-text-dim mt-1">No consecutive swelling, no recent giving-way, shin symptoms stable or improving.</p>
          </Card>
        )}

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Left-shin symptom rating</h2>
          {shinData.length === 0 ? (
            <EmptyState title="No check-ins yet" />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={shinData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="date" stroke="#8b98a5" fontSize={11} />
                  <YAxis stroke="#8b98a5" fontSize={11} width={24} domain={[0, 10]} />
                  <Tooltip contentStyle={{ background: '#1a222b', border: '1px solid #232c37', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="shin" stroke="#f2b84b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Recent check-ins</h2>
          <div className="flex flex-col gap-2">
            {status.recent.slice().reverse().map((c) => (
              <Card key={c.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm">{fmtDate(c.date, 'EEE, MMM d')}</span>
                <div className="flex gap-1.5">
                  {c.kneeSwelling && <Badge tone="danger">Knee swelling</Badge>}
                  {c.ankleSwelling && <Badge tone="danger">Ankle swelling</Badge>}
                  {c.givingWay && <Badge tone="warn">Giving-way</Badge>}
                  <Badge>Shin {c.leftShinRating}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
