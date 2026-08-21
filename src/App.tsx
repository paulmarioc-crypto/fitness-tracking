import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { seedIfEmpty } from './db/seed'
import { Today } from './pages/Today'
import { Train } from './pages/Train'
import { Exercises } from './pages/Exercises'
import { ExerciseDetail } from './pages/ExerciseDetail'
import { Progress } from './pages/Progress'
import { More } from './pages/More'
import { HealthFlags } from './pages/HealthFlags'
import { Settings } from './pages/Settings'
import { CrossAnalysis } from './pages/CrossAnalysis'
import { WorkoutDetail } from './pages/WorkoutDetail'

function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedIfEmpty().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="min-h-svh flex items-center justify-center text-text-dim">
        Loading…
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/train" element={<Train />} />
        <Route path="/workout/:dayType" element={<WorkoutDetail />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/exercises/:id" element={<ExerciseDetail />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/more" element={<More />} />
        <Route path="/more/health" element={<HealthFlags />} />
        <Route path="/more/settings" element={<Settings />} />
        <Route path="/cross-analysis" element={<CrossAnalysis />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
