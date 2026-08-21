import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

const ITEMS = [
  { to: '/', label: 'Today', icon: HomeIcon },
  { to: '/train', label: 'Train', icon: DumbbellIcon },
  { to: '/sleep', label: 'Sleep', icon: MoonIcon },
  { to: '/exercises', label: 'Moves', icon: ListIcon },
  { to: '/progress', label: 'Progress', icon: ChartIcon },
  { to: '/more', label: 'More', icon: MoreIcon },
]

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-20 bg-surface/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto grid grid-cols-6">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-accent' : 'text-text-dim')
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

type IconProps = { active?: boolean }
const stroke = (active?: boolean) => (active ? 'currentColor' : 'currentColor')

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}
function DumbbellIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5 2 11l1.5 1.5L8 8" />
      <path d="M17.5 17.5 22 13l-1.5-1.5L16 16" />
      <path d="m8 8 8 8" />
      <path d="m6 6-2-2" />
      <path d="m20 20-2-2" />
    </svg>
  )
}
function ListIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
      <path d="M9 6h11M9 12h11M9 18h11" />
    </svg>
  )
}
function ChartIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  )
}
function MoonIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
    </svg>
  )
}
function MoreIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  )
}
