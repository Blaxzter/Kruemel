import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n, setLocale } from '@/i18n'
import TreeView from './TreeView.vue'
import { createRng } from './rng'
import { clearColonizeCache, colonize, isColonized } from './colonize'
import { warmTreeCache } from './warmup'
import { layoutTree } from './layout'
import { LEAVES_FOR_SWING as SWING_AT, LEAVES_PER_APPLE, LEAVES_PER_FLOWER } from '@/domain/growth'
import { resolveSeason, resolveTimeOfDay, seasonForDate, timeOfDayForDate } from './palettes'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  setLocale('de')
})

describe('createRng', () => {
  it('repeats the same sequence for the same seed and differs between seeds', () => {
    const a = createRng(42)
    const b = createRng(42)
    const c = createRng(43)
    const seqA = Array.from({ length: 20 }, a)
    expect(Array.from({ length: 20 }, b)).toEqual(seqA)
    expect(Array.from({ length: 20 }, c)).not.toEqual(seqA)
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('colonize', () => {
  it('is deterministic per seed and memoized', () => {
    clearColonizeCache()
    const first = colonize(7)
    expect(colonize(7)).toBe(first)
    clearColonizeCache()
    const rebuilt = colonize(7)
    expect(rebuilt).not.toBe(first)
    expect(rebuilt).toEqual(first)
    expect(colonize(8).nodes).not.toEqual(first.nodes)
  })

  it('grows a trunk and a crown with valid parent links', () => {
    const { nodes, trunk } = colonize(123)
    expect(trunk).toBeGreaterThan(10)
    expect(nodes.length - trunk).toBeGreaterThan(100)
    expect(nodes[0]?.p).toBe(-1)
    nodes.slice(1).forEach((node, i) => {
      expect(node.p).toBeGreaterThanOrEqual(0)
      expect(node.p).toBeLessThan(i + 1)
    })
  })

  it('builds a skeleton quickly', () => {
    clearColonizeCache()
    const seeds = [1, 99, 512, 999]
    const start = performance.now()
    for (const seed of seeds) colonize(seed)
    const perSeed = (performance.now() - start) / seeds.length
    // Typically a few ms; generous bound for slow CI machines.
    expect(perSeed).toBeLessThan(150)

    const cachedStart = performance.now()
    for (const seed of seeds) colonize(seed)
    expect(performance.now() - cachedStart).toBeLessThan(5)
  })
})

describe('warmTreeCache', () => {
  it('builds the skeleton for the seed once the browser is idle', async () => {
    clearColonizeCache()
    let idle: (() => void) | undefined
    const done = warmTreeCache(42, (run) => {
      idle = run
    })
    expect(isColonized(42)).toBe(false)
    idle?.()
    await done
    expect(isColonized(42)).toBe(true)
    expect(isColonized(43)).toBe(false)
  })

  it('falls back to a timer without requestIdleCallback', async () => {
    clearColonizeCache()
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
    const done = warmTreeCache(77)
    await vi.runAllTimersAsync()
    vi.useRealTimers()
    await done
    expect(isColonized(77)).toBe(true)
  })
})

describe('layoutTree', () => {
  it('returns identical output for the same input', () => {
    expect(layoutTree(7, 120)).toEqual(layoutTree(7, 120))
    expect(layoutTree(7, 120)).not.toEqual(layoutTree(8, 120))
  })

  it('keeps every leaf on its twig and angle as the tree grows', () => {
    const big = layoutTree(31, 400)
    for (const count of [1, 5, 40, 120, 260, 399]) {
      const small = layoutTree(31, count)
      expect(small.leaves).toHaveLength(count)
      small.leaves.forEach((leaf, i) => {
        expect(leaf.anchorX).toBe(big.leaves[i]?.anchorX)
        expect(leaf.anchorY).toBe(big.leaves[i]?.anchorY)
        expect(leaf.deg).toBe(big.leaves[i]?.deg)
      })
    }
  })

  it('keeps rendered leaf positions fixed once the tree is full size', () => {
    const a = layoutTree(5, 210)
    const b = layoutTree(5, 330)
    expect(a.scale).toBe(1)
    expect(b.leaves.slice(0, 210).map((l) => l.transform)).toEqual(a.leaves.map((l) => l.transform))
  })

  it('shows only a seed at 0 leaves', () => {
    const seed = layoutTree(7, 0)
    expect(seed.isSeed).toBe(true)
    expect(seed.leafCount).toBe(0)
    expect(seed.leaves).toEqual([])
    expect(seed.segments).toEqual([])
    expect(seed.flowers).toEqual([])
    expect(seed.apples).toEqual([])
    expect(seed.swing.visible).toBe(false)
  })

  it('adds a flower every 7 leaves, an apple every 30 and the swing at 60', () => {
    for (const n of [1, 6, 7, 13, 14, 29, 30, 59, 60, 61, 211]) {
      const layout = layoutTree(17, n)
      expect(layout.flowers).toHaveLength(Math.floor(n / LEAVES_PER_FLOWER))
      expect(layout.apples).toHaveLength(Math.floor(n / LEAVES_PER_APPLE))
      expect(layout.swing.visible).toBe(n >= SWING_AT)
    }
  })

  it('never shrinks: branches only get added', () => {
    let previous = 0
    for (const n of [1, 10, 50, 100, 200, 260, 400]) {
      const count = layoutTree(3, n).segments.length
      expect(count).toBeGreaterThanOrEqual(previous)
      previous = count
    }
  })

  // Seeds like 198 used to grow no crown at all (trunk top out of reach of every attraction
  // point), so layoutTree threw and the intro's tree step (and the tree page) drew nothing.
  it('draws a tree for every seed onboarding can pick (1 to 999)', () => {
    for (let seed = 1; seed <= 999; seed++) {
      const { nodes, trunk } = colonize(seed)
      expect(nodes.length - trunk, `seed ${seed}`).toBeGreaterThanOrEqual(3)
      expect(() => layoutTree(seed, 1), `seed ${seed}`).not.toThrow()
      expect(layoutTree(seed, 180).leaves, `seed ${seed}`).toHaveLength(180)
    }
    // About 2 s alone, but 999 colonizations can take several times that while every other
    // test file runs in parallel.
  }, 60_000)

  it('sanitizes odd input', () => {
    expect(layoutTree(7, -3).isSeed).toBe(true)
    expect(layoutTree(7, Number.NaN).isSeed).toBe(true)
    expect(layoutTree(0, 10).leaves).toHaveLength(10)
    expect(layoutTree(7, 2.6).leaves).toHaveLength(3)
  })
})

describe('season and time of day', () => {
  it('maps months to seasons', () => {
    const season = (month: number) => seasonForDate(new Date(2026, month - 1, 15))
    expect([1, 2, 3, 5, 6, 8, 9, 11, 12].map(season)).toEqual([
      'winter', 'winter', 'spring', 'spring', 'summer', 'summer', 'autumn', 'autumn', 'winter',
    ])
  })

  it('maps hours to times of day', () => {
    const tod = (h: number) => timeOfDayForDate(new Date(2026, 5, 1, h, 30))
    expect([0, 4, 5, 8, 9, 16, 17, 20, 21, 23].map(tod)).toEqual([
      'night', 'night', 'morning', 'morning', 'day', 'day', 'evening', 'evening', 'night', 'night',
    ])
  })

  it('uses explicit choices and resolves auto from the date', () => {
    const date = new Date(2026, 0, 10, 22)
    expect(resolveSeason('summer', date)).toBe('summer')
    expect(resolveSeason('auto', date)).toBe('winter')
    expect(resolveTimeOfDay('day', date)).toBe('day')
    expect(resolveTimeOfDay('auto', date)).toBe('night')
  })
})

function mountTree(props: Partial<InstanceType<typeof TreeView>['$props']> = {}) {
  return mount(TreeView, {
    props: { leaves: 12, seed: 7, season: 'autumn', time: 'day', ...props },
    global: { plugins: [i18n] },
  })
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

describe('TreeView', () => {
  it('renders exactly as many leaves as given', async () => {
    const wrapper = mountTree({ leaves: 23 })
    expect(wrapper.findAll('[data-part="leaf"]')).toHaveLength(23)
    expect(wrapper.attributes('data-leaves')).toBe('23')
    await wrapper.setProps({ leaves: 150 })
    expect(wrapper.findAll('[data-part="leaf"]')).toHaveLength(150)
    expect(wrapper.findAll('[data-part="flower"]')).toHaveLength(21)
    expect(wrapper.findAll('[data-part="apple"]')).toHaveLength(5)
    expect(wrapper.find('[data-part="swing"]').exists()).toBe(true)
  })

  it('is an image with a translated, pluralised label', async () => {
    const wrapper = mountTree({ leaves: 23 })
    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes('aria-label')).toBe('Ein Baum mit 23 Blättern')
    await wrapper.setProps({ leaves: 1 })
    expect(wrapper.attributes('aria-label')).toBe('Ein Baum mit 1 Blatt')
    setLocale('en')
    await wrapper.vm.$nextTick()
    expect(wrapper.attributes('aria-label')).toBe('A tree with 1 leaf')
  })

  it('shows the seed state at 0 leaves', () => {
    const wrapper = mountTree({ leaves: 0, bird: true })
    expect(wrapper.find('[data-part="seed"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-part="leaf"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-part="branches"] line')).toHaveLength(0)
    expect(wrapper.find('[data-part="bird"]').exists()).toBe(false)
    expect(wrapper.attributes('aria-label')).toBe('Ein Samen in der Erde')
  })

  it('outlines and pops only the newest leaf when fresh', () => {
    const wrapper = mountTree({ leaves: 9, fresh: true })
    const fresh = wrapper.findAll('[data-fresh]')
    expect(fresh).toHaveLength(1)
    expect(fresh[0]?.classes()).toContain('leaf-new')
    const leaves = wrapper.findAll('[data-part="leaf"]')
    expect(leaves[8]?.find('[data-fresh]').exists()).toBe(true)
    expect(leaves[8]?.find('path').attributes('stroke')).toBe('#FFFFFF')
    expect(mountTree({ leaves: 9 }).findAll('[data-fresh]')).toHaveLength(0)
  })

  it('animates by default and drops every animation class under reduced motion', () => {
    stubReducedMotion(false)
    const moving = mountTree({ leaves: 9, fresh: true, bird: true, time: 'night' })
    expect(moving.find('.sway').exists()).toBe(true)
    expect(moving.find('.leaf-new').exists()).toBe(true)
    expect(moving.find('.bird-bob').exists()).toBe(true)
    expect(moving.findAll('.star').length).toBeGreaterThan(0)
    expect(mountTree({ time: 'day' }).find('.cloud-a').exists()).toBe(true)

    stubReducedMotion(true)
    for (const time of ['night', 'day'] as const) {
      const still = mountTree({ leaves: 9, fresh: true, bird: true, time })
      expect(still.classes()).toContain('tree-view--still')
      for (const cls of ['sway', 'leaf-new', 'bird-bob', 'cloud-a', 'cloud-b', 'star']) {
        expect(still.find(`.${cls}`).exists()).toBe(false)
      }
      // The fresh leaf is still marked, just without motion.
      expect(still.find('[data-fresh]').exists()).toBe(true)
    }
  })

  it('stays still with the still prop even when motion is allowed', () => {
    stubReducedMotion(false)
    for (const time of ['night', 'day'] as const) {
      const still = mountTree({ leaves: 9, fresh: true, bird: true, time, still: true })
      expect(still.classes()).toContain('tree-view--still')
      for (const cls of ['sway', 'leaf-new', 'bird-bob', 'cloud-a', 'cloud-b', 'star']) {
        expect(still.find(`.${cls}`).exists()).toBe(false)
      }
    }
  })

  it('draws no falling leaves', () => {
    const html = mountTree({ leaves: 200, season: 'autumn' }).html()
    expect(html).not.toMatch(/fall/i)
  })

  it('shows the bird only when asked', () => {
    expect(mountTree({ bird: true }).find('[data-part="bird"]').exists()).toBe(true)
    expect(mountTree().find('[data-part="bird"]').exists()).toBe(false)
  })

  it('draws sun and clouds by day, moon and stars at night, snow in winter', () => {
    const day = mountTree({ time: 'day', season: 'summer' })
    expect(day.find('[data-part="sun"]').exists()).toBe(true)
    expect(day.findAll('[data-part="cloud"]')).toHaveLength(2)
    expect(day.find('[data-part="moon"]').exists()).toBe(false)
    expect(day.find('[data-part="sky"]').attributes('fill')).toBe('#FFF4D6')

    const night = mountTree({ time: 'night', season: 'winter' })
    expect(night.find('[data-part="sun"]').exists()).toBe(false)
    expect(night.find('[data-part="moon"]').exists()).toBe(true)
    expect(night.findAll('[data-part="stars"] circle')).toHaveLength(7)
    expect(night.find('[data-part="snow"]').exists()).toBe(true)
    expect(night.find('[data-part="sky"]').attributes('fill')).toBe('#28305A')
  })

  it("resolves 'auto' season and time from the clock", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 4, 19, 0))
    const wrapper = mountTree({ season: 'auto', time: 'auto' })
    // July evening: evening sky, summer ground.
    expect(wrapper.find('[data-part="sky"]').attributes('fill')).toBe('#F7C2A2')
    expect(wrapper.find('path[fill="#AEDB94"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('sizes the svg with the 360:440 aspect', () => {
    const wrapper = mountTree({ size: 90 })
    expect(wrapper.attributes('width')).toBe('90')
    expect(wrapper.attributes('height')).toBe('110')
    expect(wrapper.attributes('viewBox')).toBe('0 0 360 440')
  })
})
