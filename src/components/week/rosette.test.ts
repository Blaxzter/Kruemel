import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { BUILTIN_TILES } from '@/domain/tiles'
import type { Entry, Tile } from '@/domain/types'
import { i18n } from '@/i18n'
import VarietyCard from './VarietyCard.vue'
import { varietyPetals, weekMatrix, type Petal } from '@/domain/variety'
import { petalShapes } from './rosette'

const TODAY = '2026-10-27'
let seq = 0
const e = (tileId: string, dayKey: string): Entry => ({ id: `e${++seq}`, tileId, dayKey, at: 0 })
const label = (t: Tile) => t.name ?? t.builtinKey ?? t.id
const builtins = (): Tile[] => BUILTIN_TILES.map((t) => ({ ...t }))

describe('varietyPetals', () => {
  it('gives every visible tile one petal in tile order, filled when logged in the last 7 days', () => {
    const entries = [
      e('fruit', TODAY),
      e('fruit', TODAY),
      e('bread', '2026-10-21'), // first day of the window
      e('veg', '2026-10-20'), // one day too old
    ]
    const petals = varietyPetals(entries, builtins(), TODAY, label)
    expect(petals.map((p) => p.id)).toEqual(BUILTIN_TILES.map((t) => t.id))
    const filled = Object.fromEntries(petals.map((p) => [p.id, p.filled]))
    expect(filled.fruit).toBe(true)
    expect(filled.bread).toBe(true)
    expect(filled.veg).toBe(false)
    expect(petals.filter((p) => p.filled)).toHaveLength(2)
    expect(petals.find((p) => p.id === 'fruit')?.dot).toBe(`var(--tile-${BUILTIN_TILES.find((t) => t.id === 'fruit')!.color}-dot)`)
  })

  it('leaves out hidden tiles, unless they were logged this week', () => {
    const tiles = builtins().map((t) => (t.id === 'sweets' || t.id === 'dairy' ? { ...t, hidden: true } : t))
    const petals = varietyPetals([e('sweets', TODAY), e('fruit', TODAY)], tiles, TODAY, label)
    expect(petals.map((p) => p.id)).not.toContain('dairy')
    expect(petals).toHaveLength(BUILTIN_TILES.length - 1)
    expect(petals.filter((p) => p.filled).map((p) => p.id)).toEqual(['fruit', 'sweets'])
  })

  it('counts the same n/total as the week grid on the Vielfalt page', () => {
    // 8 visible tiles plus a hidden custom tile logged this week, and one logged too long ago.
    const tiles: Tile[] = [
      ...builtins(),
      { id: 'c1', builtinKey: null, name: 'Nüsse', icon: 'snack', color: 'latte', order: 8, hidden: true },
      { id: 'c2', builtinKey: null, name: 'Suppe', icon: 'bowl', color: 'sky', order: 9, hidden: true },
    ]
    const entries = [e('fruit', TODAY), e('veg', '2026-10-24'), e('c1', '2026-10-22'), e('c2', '2026-10-01')]
    const petals = varietyPetals(entries, tiles, TODAY, label)
    const matrix = weekMatrix(entries, tiles, TODAY)
    expect(petals.length).toBe(matrix.rows.length)
    expect(petals.filter((p) => p.filled).length).toBe(matrix.tilesSeen)
    expect([petals.filter((p) => p.filled).length, petals.length]).toEqual([3, 9])
  })

  it('includes custom tiles with their own colour and name', () => {
    const custom: Tile = { id: 'c1', builtinKey: null, name: 'Nüsse', icon: BUILTIN_TILES[0]!.icon, color: 'latte', order: -1, hidden: false }
    const petals = varietyPetals([e('c1', '2026-10-25')], [...builtins(), custom], TODAY, label)
    expect(petals).toHaveLength(BUILTIN_TILES.length + 1)
    expect(petals[0]).toEqual({ id: 'c1', label: 'Nüsse', dot: 'var(--tile-latte-dot)', filled: true })
  })
})

describe('petalShapes', () => {
  it('spreads the petals evenly from the top, and narrows them as their number grows', () => {
    expect(petalShapes(0)).toEqual([])
    const eight = petalShapes(8)
    expect(eight.map((s) => s.angle)).toEqual([0, 45, 90, 135, 180, 225, 270, 315])
    const sixteen = petalShapes(16)
    expect(sixteen[0]!.rx).toBeLessThan(eight[0]!.rx)
    expect(petalShapes(1)[0]!.rx).toBeLessThanOrEqual(14)
    // Neighbouring petals never overlap: width stays below the arc between two centres.
    for (const n of [3, 8, 12, 20]) {
      const [shape] = petalShapes(n)
      expect(shape!.rx * 2).toBeLessThan((2 * Math.PI * (50 - shape!.cy)) / n)
    }
  })
})

describe('VarietyCard', () => {
  const petals: Petal[] = [
    { id: 'a', label: 'Obst', dot: 'var(--tile-mint-dot)', filled: true },
    { id: 'b', label: 'Brot', dot: 'var(--tile-butter-dot)', filled: true },
    { id: 'c', label: 'Milch', dot: 'var(--tile-sky-dot)', filled: false },
  ]

  async function mountCard(list: Petal[]) {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)', component: { render: () => null } }] })
    await router.push('/woche')
    return mount(VarietyCard, { props: { petals: list }, global: { plugins: [i18n, router] } })
  }

  it('draws filled and outlined petals, the count and a calm caption', async () => {
    const wrapper = await mountCard(petals)
    const drawn = wrapper.findAll('.rosette__petal')
    expect(drawn.map((p) => p.attributes('data-filled'))).toEqual(['true', 'true', 'false'])
    expect(drawn.map((p) => p.classes('rosette__petal--open'))).toEqual([false, false, true])
    expect(wrapper.find('.rosette__count').text()).toBe('2/3')
    expect(wrapper.find('.mini-card__text').text()).toBe('2 von 3 diese Woche. Je bunter, desto abwechslungsreicher.')
    expect(wrapper.text()).not.toMatch(/fehlt|Milch/)
  })

  it('is one link to /vielfalt whose name starts with the visible title', async () => {
    const wrapper = await mountCard(petals)
    const links = wrapper.findAll('a')
    expect(links).toHaveLength(1)
    expect(links[0]!.attributes('href')).toBe('/vielfalt')
    expect(links[0]!.text()).toBe('Deine Vielfalt')
    expect(links[0]!.attributes('aria-label')).toBe('Deine Vielfalt, 2 von 3 Kacheln diese Woche')
    expect(wrapper.find('.rosette').attributes('aria-hidden')).toBe('true')
  })

  it('shows only the tagline when no tile is visible', async () => {
    const wrapper = await mountCard([])
    expect(wrapper.find('.mini-card__text').text()).toBe('Je bunter, desto abwechslungsreicher.')
    expect(wrapper.find('.rosette__count').text()).toBe('0/0')
  })
})
