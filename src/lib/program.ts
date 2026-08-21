import { differenceInCalendarDays, parseISO } from 'date-fns'
import { db } from '../db/schema'
import { todayStr } from '../db/queries'

export interface ProgramWeekInfo {
  /** null when no program start date has been set yet. */
  week: number | null
  block: 1 | 2 | 3 | null
  blockLabel: string | null
  isDeloadWeek: boolean
  /** true once week > 12 — the 12-week block structure no longer applies, latest block's prescriptions keep being used. */
  pastProgram: boolean
}

const UNSET: ProgramWeekInfo = { week: null, block: null, blockLabel: null, isDeloadWeek: false, pastProgram: false }

export function computeProgramWeek(startDate: string | null, today = todayStr()): ProgramWeekInfo {
  if (!startDate) return UNSET

  const daysSince = differenceInCalendarDays(parseISO(today), parseISO(startDate))
  if (daysSince < 0) return UNSET

  const rawWeek = Math.floor(daysSince / 7) + 1
  const pastProgram = rawWeek > 12
  const week = Math.min(rawWeek, 12)
  const block = (Math.min(Math.ceil(week / 4), 3) as 1 | 2 | 3)
  const isDeloadWeek = !pastProgram && week % 4 === 0

  return {
    week: rawWeek,
    block,
    blockLabel: block === 1 ? 'Capacity + Control' : block === 2 ? 'Strength + Eccentric Control' : 'Strength + Athletic Resilience/Power',
    isDeloadWeek,
    pastProgram,
  }
}

export async function getProgramStartDate(): Promise<string | null> {
  const settings = await db.programSettings.get('singleton')
  return settings?.startDate ?? null
}

export async function setProgramStartDate(startDate: string | null) {
  await db.programSettings.put({ id: 'singleton', startDate })
}

export async function getCurrentProgramWeek(): Promise<ProgramWeekInfo> {
  const startDate = await getProgramStartDate()
  return computeProgramWeek(startDate)
}
