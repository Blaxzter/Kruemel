/**
 * Locale formatting helpers shared by the Week, Vielfalt and Tree screens.
 * Take the app locale ("de" | "en"); English is formatted as en-GB like the Today screen.
 * The diary rules themselves (days, parts of day, leaves, bird, season) live in @/domain.
 */
import { intlLocale } from '@/components/today/todayModel'

/** Short weekday name without the trailing dot German Intl adds ("Mi." becomes "Mi"). */
export function shortWeekday(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short' }).format(date).replace(/\.$/, '')
}

/** Monday-first short weekday names. */
export function weekdayHeads(locale: string): string[] {
  // 1 January 2024 was a Monday.
  return Array.from({ length: 7 }, (_, i) => shortWeekday(new Date(2024, 0, 1 + i, 12), locale))
}

/** Long month name, e.g. "Oktober". */
export function monthName(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'long' }).format(date)
}

/** "21. bis 27. Oktober" style range; the message decides the word order per language. */
export function formatRange(
  first: Date,
  last: Date,
  locale: string,
  t: (key: string, named: Record<string, unknown>) => string,
): string {
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return t('week.range.sameMonth', { from: first.getDate(), to: last.getDate(), month: monthName(last, locale) })
  }
  const dayMonth = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long' })
  return t('week.range.crossMonth', { from: dayMonth.format(first), to: dayMonth.format(last) })
}
