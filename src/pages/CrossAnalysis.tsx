import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  getCrossTrainingWeekly,
  getBikeTrend,
  getIntensityDistribution,
  getWeeklyTotalGymVolume,
  type CrossTrainingWeekPoint,
  type BikeSessionPoint,
  type IntensityDistribution,
  type WeeklyTotalVolumePoint,
} from '../lib/analytics'
import { fmtDate } from '../lib/dates'
import { Shell } from '../components/layout/Shell'
import { Card, EmptyState } from '../components/ui'

const TICK = { fontSize: 11, stroke: '#8b98a5' }
const TOOLTIP_STYLE = { background: '#1a222b', border: '1px solid #232c37', borderRadius: 8 }

export function CrossAnalysis() {
  const [weekly, setWeekly] = useState<CrossTrainingWeekPoint[]>([])
  const [bike, setBike] = useState<BikeSessionPoint[]>([])
  const [intensity, setIntensity] = useState<IntensityDistribution[]>([])
  const [gymVolume, setGymVolume] = useState<WeeklyTotalVolumePoint[]>([])

  useEffect(() => {
    getCrossTrainingWeekly().then(setWeekly)
    getBikeTrend().then(setBike)
    getIntensityDistribution(['soccer', 'volleyball']).then(setIntensity)
    getWeeklyTotalGymVolume().then(setGymVolume)
  }, [])

  const durationData = weekly.map((w) => ({
    week: fmtDate(w.week),
    Bike: w.byType.bike.durationMin,
    Soccer: w.byType.soccer.durationMin,
    Volleyball: w.byType.volleyball.durationMin,
  }))
  const bikeData = bike.map((b) => ({ date: fmtDate(b.date), power: b.avgPower, hr: b.avgHR }))
  const intensityData = intensity.map((i) => ({ type: i.type, Easy: i.easy, Moderate: i.moderate, Hard: i.hard }))
  const gymVolumeData = gymVolume.map((g) => ({ week: fmtDate(g.week), volume: Math.round(g.totalVolume) }))

  return (
    <Shell title="Cross-Training Analysis">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Weekly minutes — bike / soccer / volleyball</h2>
          {durationData.length === 0 ? (
            <EmptyState title="No cross-training logged yet" />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="week" {...TICK} />
                  <YAxis {...TICK} width={36} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Bike" fill="#6ea8fe" />
                  <Bar dataKey="Soccer" fill="#4fd1a5" />
                  <Bar dataKey="Volleyball" fill="#c792ea" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Weekly gym volume</h2>
          {gymVolumeData.length === 0 ? (
            <EmptyState title="No gym sessions logged yet" />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gymVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="week" {...TICK} />
                  <YAxis {...TICK} width={44} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="volume" fill="#f2b84b" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Bike: HR &amp; power per session</h2>
          {bikeData.length === 0 ? (
            <EmptyState title="No bike sessions logged yet" />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bikeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="date" {...TICK} />
                  <YAxis {...TICK} width={36} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="power" stroke="#f2b84b" strokeWidth={2} name="Avg power (W)" connectNulls />
                  <Line type="monotone" dataKey="hr" stroke="#f26d6d" strokeWidth={2} name="Avg HR" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-dim mb-2 uppercase tracking-wide">Soccer / volleyball intensity mix</h2>
          {intensityData.every((i) => i.Easy + i.Moderate + i.Hard === 0) ? (
            <EmptyState title="No sessions logged yet" />
          ) : (
            <Card>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={intensityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232c37" />
                  <XAxis dataKey="type" {...TICK} className="capitalize" />
                  <YAxis {...TICK} width={30} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Easy" stackId="a" fill="#4fd1a5" />
                  <Bar dataKey="Moderate" stackId="a" fill="#f2b84b" />
                  <Bar dataKey="Hard" stackId="a" fill="#f26d6d" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  )
}
