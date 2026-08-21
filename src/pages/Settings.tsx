import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { exportAllAsJSON, exportSetsAsCSV, exportCrossTrainingAsCSV, exportHealthCheckinsAsCSV } from '../lib/export'
import { Shell } from '../components/layout/Shell'
import { Card, Button } from '../components/ui'

export function Settings() {
  const [confirmReset, setConfirmReset] = useState(false)
  const counts = useLiveQuery(async () => ({
    exercises: await db.exercises.count(),
    sessions: await db.sessions.count(),
    sets: await db.sets.count(),
    crossTraining: await db.crossTraining.count(),
    checkins: await db.healthCheckins.count(),
    bodyWeight: await db.bodyWeight.count(),
  }))

  async function resetAllData() {
    await Promise.all([
      db.exercises.clear(),
      db.dayTemplates.clear(),
      db.sessions.clear(),
      db.sessionExercises.clear(),
      db.sets.clear(),
      db.crossTraining.clear(),
      db.healthCheckins.clear(),
      db.bodyWeight.clear(),
    ])
    window.location.reload()
  }

  return (
    <Shell title="Settings">
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="font-medium mb-2">Your data</h2>
          <p className="text-sm text-text-dim">
            Everything is stored locally on this device (IndexedDB) — nothing leaves your phone or laptop. Export regularly so you don't lose it.
          </p>
          {counts && (
            <ul className="text-sm text-text-dim mt-3 grid grid-cols-2 gap-1">
              <li>{counts.exercises} exercises</li>
              <li>{counts.sessions} sessions</li>
              <li>{counts.sets} sets logged</li>
              <li>{counts.crossTraining} cross-training entries</li>
              <li>{counts.checkins} health check-ins</li>
              <li>{counts.bodyWeight} body-weight entries</li>
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="font-medium mb-1">Export</h2>
          <Button variant="secondary" onClick={() => exportAllAsJSON()}>Export everything (JSON)</Button>
          <Button variant="secondary" onClick={() => exportSetsAsCSV()}>Export workout sets (CSV)</Button>
          <Button variant="secondary" onClick={() => exportCrossTrainingAsCSV()}>Export cross-training (CSV)</Button>
          <Button variant="secondary" onClick={() => exportHealthCheckinsAsCSV()}>Export health check-ins (CSV)</Button>
        </Card>

        <Card>
          <h2 className="font-medium mb-1">External sync</h2>
          <p className="text-sm text-text-dim">
            Google Fit / Fitbit auto-sync isn't wired up yet — log bike/soccer/volleyball manually for now. The data model already separates manual entry
            from external ingestion, so this can be added later without a rewrite.
          </p>
        </Card>

        <Card className="border-danger/40">
          <h2 className="font-medium mb-1 text-danger">Danger zone</h2>
          <p className="text-sm text-text-dim mb-2">Permanently delete all local data. Export first — this can't be undone.</p>
          {confirmReset ? (
            <div className="flex gap-2">
              <Button variant="danger" onClick={resetAllData}>Yes, delete everything</Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmReset(true)}>Reset all data</Button>
          )}
        </Card>
      </div>
    </Shell>
  )
}
