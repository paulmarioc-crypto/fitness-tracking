import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type { DayTemplate, WorkoutSession } from '../types'

/**
 * The plan's permanent weekly skeleton (Section 3): Monday Upper A,
 * Tuesday Lower A, Wednesday Upper B, Thursday Lower B. Numbering them
 * Workout 1-4 is what makes "Week 3, Workout 2" a thing you can point at.
 */
export interface WorkoutSlot {
  index: number
  dayType: string
  weekday: string
  /** date-fns day index: 0 = Sunday ... 6 = Saturday */
  weekdayIndex: number
}

export const WORKOUT_SLOTS: WorkoutSlot[] = [
  { index: 1, dayType: 'Upper A', weekday: 'Monday', weekdayIndex: 1 },
  { index: 2, dayType: 'Lower A', weekday: 'Tuesday', weekdayIndex: 2 },
  { index: 3, dayType: 'Upper B', weekday: 'Wednesday', weekdayIndex: 3 },
  { index: 4, dayType: 'Lower B', weekday: 'Thursday', weekdayIndex: 4 },
]

export function slotForDayType(dayType: string): WorkoutSlot | undefined {
  return WORKOUT_SLOTS.find((s) => s.dayType === dayType)
}

export interface DateRange {
  start: string
  end: string
}

/**
 * The 7-day window for a given program week. Program week 1 begins on the
 * configured start date, so weeks run start-date-relative rather than
 * Mon-Sun. With no start date set we fall back to the current calendar week
 * so the dashboard still groups sensibly.
 */
export function getWeekRange(startDate: string | null, week: number | null, today: string): DateRange {
  if (startDate && week && week > 0) {
    const start = addDays(parseISO(startDate), (week - 1) * 7)
    return { start: format(start, 'yyyy-MM-dd'), end: format(addDays(start, 6), 'yyyy-MM-dd') }
  }
  const start = startOfWeek(parseISO(today), { weekStartsOn: 1 })
  return { start: format(start, 'yyyy-MM-dd'), end: format(addDays(start, 6), 'yyyy-MM-dd') }
}

export type WorkoutStatus = 'not_started' | 'in_progress' | 'completed'

export interface WeekWorkout {
  slot: WorkoutSlot
  template: DayTemplate | null
  /** The session for this slot within the week window, if one exists. */
  session: WorkoutSession | null
  status: WorkoutStatus
  /** Calendar date this workout is scheduled for inside the week window. */
  scheduledDate: string
}

/**
 * Pure so it can recompute straight from live Dexie queries — pass the
 * block's templates and the sessions already fetched for the week window.
 */
export function buildWeekWorkouts(templates: DayTemplate[], weekSessions: WorkoutSession[], block: number, range: DateRange): WeekWorkout[] {
  const weekStart = parseISO(range.start)

  return WORKOUT_SLOTS.map((slot) => {
    const template = templates.find((t) => t.dayType === slot.dayType && t.block === block) ?? null

    // Sessions are matched by day-type name, newest first, so a re-done
    // workout in the same week shows its latest state.
    const matches = weekSessions
      .filter((s) => s.dayTypeName === slot.dayType)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const completed = matches.find((s) => s.status === 'completed')
    const session = completed ?? matches[0] ?? null

    const status: WorkoutStatus = !session ? 'not_started' : session.status === 'completed' ? 'completed' : 'in_progress'

    // slot.weekdayIndex is 1..4 (Mon..Thu); the week window starts Monday
    // when derived from the calendar, and from the program start date
    // otherwise — either way offset from the window start.
    const scheduledDate = format(addDays(weekStart, slot.index - 1), 'yyyy-MM-dd')

    return { slot, template, session, status, scheduledDate }
  })
}
