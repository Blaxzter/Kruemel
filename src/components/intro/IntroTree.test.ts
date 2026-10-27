import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n, setLocale } from '@/i18n'
import IntroTree from './IntroTree.vue'

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.useRealTimers()
  setLocale('de')
})

function mockReducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

function mountTree() {
  return mount(IntroTree, { props: { seed: 42 }, global: { plugins: [i18n] } })
}

function drawnLeaves(wrapper: ReturnType<typeof mountTree>): number {
  return Number(wrapper.find('[data-testid="tree-view"]').attributes('data-leaves'))
}

describe('IntroTree', () => {
  // The design's 30 leaves drew a thin sapling in a mostly empty frame, which read as
  // "the tree did not load". The preview shows a grown crown with flowers and apples.
  it('draws a grown tree right away with reduced motion', () => {
    mockReducedMotion(true)
    const wrapper = mountTree()
    expect(drawnLeaves(wrapper)).toBe(180)
    expect(wrapper.findAll('[data-part="branches"] line').length).toBeGreaterThan(150)
    vi.unstubAllGlobals()
  })

  it('grows from a sapling to the full preview tree', async () => {
    mockReducedMotion(false)
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    const wrapper = mountTree()
    expect(drawnLeaves(wrapper)).toBe(1)
    vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()
    const midway = drawnLeaves(wrapper)
    expect(midway).toBeGreaterThan(1)
    expect(midway).toBeLessThan(180)
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    expect(drawnLeaves(wrapper)).toBe(180)
    vi.unstubAllGlobals()
  })
})
