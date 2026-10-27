import { describe, expect, it } from 'vitest'
import { addDays } from './day'
import {
  appleCount,
  flowerCount,
  greetingFor,
  hasFreshLeaf,
  hasSwing,
  leafCount,
  loggedDays,
  nextMilestones,
  seasonFor,
  showBird,
  timeOfDayFor,
} from './growth'

const days = (...keys: string[]) => keys.map((dayKey) => ({ dayKey }))

describe('leaves', () => {
  it('counts distinct days with entries', () => {
    const e = days('2026-10-20', '2026-10-20', '2026-10-22', '2026-10-27', '2026-10-27')
    expect(leafCount(e)).toBe(3)
    expect(loggedDays(e)).toEqual(['2026-10-20', '2026-10-22', '2026-10-27'])
    expect(leafCount([])).toBe(0)
  })

  it('derives flowers, apples and the swing', () => {
    expect([flowerCount(0), flowerCount(6), flowerCount(7), flowerCount(23)]).toEqual([0, 0, 1, 3])
    expect([appleCount(29), appleCount(30), appleCount(61)]).toEqual([0, 1, 2])
    expect([hasSwing(59), hasSwing(60)]).toEqual([false, true])
  })

  it('never shrinks as days are added', () => {
    let prev = { leaves: 0, flowers: 0, apples: 0 }
    const list: { dayKey: string }[] = []
    for (let i = 0; i < 120; i += 1 + (i % 4)) {
      list.push({ dayKey: addDays('2026-01-01', i) })
      const leaves = leafCount(list)
      const now = { leaves, flowers: flowerCount(leaves), apples: appleCount(leaves) }
      expect(now.leaves).toBeGreaterThanOrEqual(prev.leaves)
      expect(now.flowers).toBeGreaterThanOrEqual(prev.flowers)
      expect(now.apples).toBeGreaterThanOrEqual(prev.apples)
      prev = now
    }
  })

  it('reports the next flower and apple like the Tree design', () => {
    expect(nextMilestones(23)).toEqual({ toFlower: 5, toApple: 7, firstApple: true })
    expect(nextMilestones(28)).toEqual({ toFlower: 7, toApple: 2, firstApple: true })
    expect(nextMilestones(30)).toEqual({ toFlower: 5, toApple: 30, firstApple: false })
    expect(nextMilestones(0)).toEqual({ toFlower: 7, toApple: 30, firstApple: true })
  })
})

describe('bird', () => {
  const today = '2026-10-27'
  it('welcomes back after a gap of 3 or more days', () => {
    expect(showBird(days('2026-10-24', today), today)).toBe(true)
    expect(showBird(days('2026-09-01', today), today)).toBe(true)
  })
  it('does not show for short gaps', () => {
    expect(showBird(days('2026-10-25', today), today)).toBe(false)
    expect(showBird(days('2026-10-26', today), today)).toBe(false)
  })
  it('needs an entry today and a previous day', () => {
    expect(showBird(days('2026-10-20'), today)).toBe(false)
    expect(showBird(days(today), today)).toBe(false)
  })
  it('ignores later days (e.g. clock changes) when finding the previous one', () => {
    expect(showBird(days('2026-10-20', today, '2026-10-28'), today)).toBe(true)
  })
})

describe('fresh leaf', () => {
  it('is fresh only when today has an entry', () => {
    expect(hasFreshLeaf(days('2026-10-27'), '2026-10-27')).toBe(true)
    expect(hasFreshLeaf(days('2026-10-26'), '2026-10-27')).toBe(false)
  })
})

describe('season and time of day', () => {
  it.each([
    [1, 'winter'], [2, 'winter'], [3, 'spring'], [5, 'spring'], [6, 'summer'],
    [8, 'summer'], [9, 'autumn'], [11, 'autumn'], [12, 'winter'],
  ] as const)('month %i is %s', (month, season) => {
    expect(seasonFor(new Date(2026, month - 1, 15))).toBe(season)
  })

  it.each([
    [4, 'night'], [5, 'morning'], [8, 'morning'], [9, 'day'], [16, 'day'],
    [17, 'evening'], [20, 'evening'], [21, 'night'], [0, 'night'],
  ] as const)('%i:00 is %s', (hour, time) => {
    expect(timeOfDayFor(new Date(2026, 9, 27, hour, 30))).toBe(time)
  })

  it('picks the header greeting by hour', () => {
    expect(greetingFor(new Date(2026, 9, 27, 10, 59))).toBe('morning')
    expect(greetingFor(new Date(2026, 9, 27, 11))).toBe('day')
    expect(greetingFor(new Date(2026, 9, 27, 17))).toBe('evening')
  })
})
