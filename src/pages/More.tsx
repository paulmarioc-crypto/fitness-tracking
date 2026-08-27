import { useNavigate } from 'react-router-dom'
import { Shell } from '../components/layout/Shell'
import { Card } from '../components/ui'

const ITEMS = [
  { to: '/cross-analysis', label: 'Cross-training analysis', hint: 'Bike, soccer, volleyball, gym', icon: '📊' },
  { to: '/more/settings', label: 'Settings & export', hint: 'CSV/JSON export, data management', icon: '⚙️' },
]

export function More() {
  const navigate = useNavigate()
  return (
    <Shell title="More">
      <div className="flex flex-col gap-2">
        {ITEMS.map((item) => (
          <Card key={item.to} className="cursor-pointer hover:border-accent transition flex items-center gap-3" onClick={() => navigate(item.to)}>
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-text-dim">{item.hint}</p>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  )
}
