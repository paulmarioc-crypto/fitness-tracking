import { format, parseISO, startOfWeek, differenceInCalendarDays } from 'date-fns'

export function fmtDate(dateStr: string, pattern = 'MMM d') {
  return format(parseISO(dateStr), pattern)
}

export function weekKey(dateStr: string) {
  return format(startOfWeek(parseISO(dateStr), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function daysAgo(dateStr: string) {
  return differenceInCalendarDays(new Date(), parseISO(dateStr))
}

export function isConsecutiveDay(prevDateStr: string, dateStr: string) {
  return differenceInCalendarDays(parseISO(dateStr), parseISO(prevDateStr)) === 1
}
