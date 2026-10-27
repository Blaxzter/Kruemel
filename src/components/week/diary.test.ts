import { describe, expect, it } from 'vitest'
import { formatRange, monthName, shortWeekday, weekdayHeads } from './diary'
import { i18n } from '@/i18n'

const t = (key: string, named: Record<string, unknown>) => `${key}|${JSON.stringify(named)}`

describe('diary formatting', () => {
  it('names weekdays without trailing dots, Monday first', () => {
    expect(weekdayHeads('de')).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
    expect(shortWeekday(new Date(2026, 9, 21, 12), 'de')).toBe('Mi')
    expect(monthName(new Date(2026, 9, 21, 12), 'de')).toBe('Oktober')
  })

  it('formats a week inside one month as days plus month', () => {
    expect(formatRange(new Date(2026, 9, 21), new Date(2026, 9, 27), 'de', t)).toBe(
      'week.range.sameMonth|{"from":21,"to":27,"month":"Oktober"}',
    )
  })

  it('formats a week across months with both month names', () => {
    expect(formatRange(new Date(2026, 8, 29), new Date(2026, 9, 5), 'de', t)).toBe(
      'week.range.crossMonth|{"from":"29. September","to":"5. Oktober"}',
    )
  })
  it('formats English the British way, like the Today screen', () => {
    expect(shortWeekday(new Date(2026, 9, 21, 12), 'en')).toBe('Wed')
    expect(monthName(new Date(2026, 9, 21, 12), 'en')).toBe('October')
    expect(formatRange(new Date(2026, 8, 29), new Date(2026, 9, 5), 'en', t)).toBe(
      'week.range.crossMonth|{"from":"29 September","to":"5 October"}',
    )
  })

  it('renders the real range messages in day-month order', () => {
    const { t: real } = i18n.global
    const tEn = (key: string, named: Record<string, unknown>) => real(key, named, { locale: 'en' })
    expect(formatRange(new Date(2026, 9, 21), new Date(2026, 9, 27), 'en', tEn)).toBe('21 to 27 October')
    expect(formatRange(new Date(2026, 9, 30), new Date(2026, 10, 5), 'en', tEn)).toBe('30 October to 5 November')
  })
})
