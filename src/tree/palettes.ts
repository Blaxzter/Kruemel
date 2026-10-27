import type { Season, TimeOfDay } from './types'

export interface SeasonPalette {
  readonly sky: string
  readonly ground: string
  readonly grass: string
  readonly bark: string
  /** Leaf midrib. */
  readonly rib: string
  readonly flower: string
  readonly leaves: readonly string[]
}

interface SunStyle {
  readonly x: number
  readonly y: number
  readonly r: number
  readonly fill: string
}

export interface TimeStyle {
  /** null: use the season's sky. */
  readonly sky: string | null
  /** null: night (moon and stars instead). */
  readonly sun: SunStyle | null
  readonly clouds: boolean
  /** Light wash over the whole scene. */
  readonly tint: string
  readonly tintOpacity: number
}

export const SEASON_PALETTES: Readonly<Record<Season, SeasonPalette>> = {
  spring: { sky: '#E6F2FF', ground: '#C4E6AE', grass: '#7CBF6A', bark: '#8A5A3C', rib: '#2F7A40', flower: '#FFB3D1', leaves: ['#7CCB7A', '#9BDB8C', '#5DB86A'] },
  summer: { sky: '#FFF4D6', ground: '#AEDB94', grass: '#5FA35A', bark: '#7E5236', rib: '#245E37', flower: '#FFFFFF', leaves: ['#4FAE6A', '#3E9A5A', '#68BF73'] },
  autumn: { sky: '#FFEFE2', ground: '#E8D6A8', grass: '#B59A5A', bark: '#7E5236', rib: '#8A4418', flower: '#FFD9E6', leaves: ['#F2A541', '#E8743B', '#E3C04A', '#9CC26B'] },
  winter: { sky: '#E3E9F6', ground: '#FFFFFF', grass: '#C9D3E6', bark: '#6E4B36', rib: '#24503D', flower: '#FFFFFF', leaves: ['#4F8F73', '#6AA88A', '#3F7D62'] },
}

export const TIME_STYLES: Readonly<Record<TimeOfDay, TimeStyle>> = {
  morning: { sky: '#FFE6D6', sun: { x: 70, y: 150, r: 16, fill: '#FFC46B' }, clouds: true, tint: '#FFB07A', tintOpacity: 0.06 },
  day: { sky: null, sun: { x: 300, y: 58, r: 18, fill: '#FFD66B' }, clouds: true, tint: '#FFFFFF', tintOpacity: 0 },
  evening: { sky: '#F7C2A2', sun: { x: 300, y: 250, r: 24, fill: '#FF9E5E' }, clouds: false, tint: '#FF7A3D', tintOpacity: 0.1 },
  night: { sky: '#28305A', sun: null, clouds: false, tint: '#141838', tintOpacity: 0.32 },
}

/** Fixed scene colours that do not depend on season or time. */
export const SCENE_COLORS = {
  soil: '#B08B66',
  sprout: '#5DB86A',
  moon: '#F4F1DE',
  star: '#FFFFFF',
  snow: '#FFFFFF',
  cloud: '#FFFFFF',
  freshOutline: '#FFFFFF',
  flowerCenter: '#F7C548',
  swingRope: '#7A5A44',
  swingSeat: '#C9884F',
  appleRed: '#E5484D',
  appleLeaf: '#5DB86A',
  appleStem: '#6E4B36',
  birdBody: '#4C7BD9',
  birdWing: '#3A63B8',
  birdBeak: '#F2A541',
  birdEye: '#231F3A',
  birdLegs: '#6E4B36',
} as const

/** Mar to May spring, Jun to Aug summer, Sep to Nov autumn, Dec to Feb winter. */
export function seasonForDate(date: Date): Season {
  const month = date.getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/** 5 to 9 morning, 9 to 17 day, 17 to 21 evening, else night (local clock). */
export function timeOfDayForDate(date: Date): TimeOfDay {
  const h = date.getHours()
  if (h >= 5 && h < 9) return 'morning'
  if (h >= 9 && h < 17) return 'day'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

export function resolveSeason(choice: Season | 'auto' | undefined, now: Date): Season {
  return choice && choice !== 'auto' && choice in SEASON_PALETTES ? choice : seasonForDate(now)
}

export function resolveTimeOfDay(choice: TimeOfDay | 'auto' | undefined, now: Date): TimeOfDay {
  return choice && choice !== 'auto' && choice in TIME_STYLES ? choice : timeOfDayForDate(now)
}
