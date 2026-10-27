import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { useEntries, useSettings, useTiles } from '@/stores'
import WeekView from '@/views/WeekView.vue'
import VarietyView from '@/views/VarietyView.vue'
import TreePageView from '@/views/TreePageView.vue'
import { mountView, resetSettings, settle } from './__tests__/testkit'

beforeAll(async () => {
  await resetSettings({ treeSeed: 42 })
  const { entries, removeEntry, addEntry } = useEntries()
  for (const e of [...entries.value]) await removeEntry(e.id)
  await addEntry('fruit')
  await addEntry('bread')
})

enableAutoUnmount(afterEach)

describe('WeekView', () => {
  it('shows 7 selectable days with today selected and its entries', async () => {
    const { wrapper } = await mountView(WeekView, '/woche')
    const days = wrapper.findAll('.strip__day')
    expect(days).toHaveLength(7)
    const today = days[6]!
    expect(today.text()).toContain('Heute')
    expect(today.attributes('aria-pressed')).toBe('true')
    // Named by content, so the name starts with the visible "Heute 27" (WCAG 2.5.3 Label in Name).
    expect(today.attributes('aria-label')).toBeUndefined()
    expect(today.text()).toMatch(/^Heute\s*\d{1,2}\s*, 2 Einträge$/)
    const first = days[0]!
    const label = first.find('.strip__label').text()
    const num = first.find('.strip__num').text()
    expect(first.text()).toMatch(new RegExp(`^${label}\\s*${num}\\s*, \\p{L}+, keine Einträge$`, 'u'))
    expect(wrapper.find('.detail__title').text()).toBe('Heute')
    expect(wrapper.find('.detail').text()).toMatch(/Obst/)
    expect(wrapper.find('.detail').text()).toMatch(/Brot/)

    await days[0]!.trigger('click')
    expect(days[0]!.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.detail').text()).toContain('An dem Tag hast du nichts eingetragen.')
  })

  it('summarises variety and the tree, and hides cards that are switched off', async () => {
    const { wrapper } = await mountView(WeekView, '/woche')
    const total = useTiles().visibleTiles.value.length
    expect(wrapper.find('.rosette__count').text()).toBe(`2/${total}`)
    expect(wrapper.findAll('.rosette__petal')).toHaveLength(total)
    expect(wrapper.text()).toContain(`2 von ${total} diese Woche. Je bunter, desto abwechslungsreicher.`)
    expect(wrapper.text()).toContain('1 neues Blatt diese Woche.')
    expect(wrapper.text()).toContain('1 insgesamt.')
    // The 90px thumbnail never animates: a sway there moves about a pixel but repaints every frame.
    const thumb = wrapper.find('tree-view-stub')
    expect(thumb.attributes('size')).toBe('90')
    expect(thumb.attributes('still')).toBe('true')

    await useSettings().update({ showColors: false })
    await settle()
    expect(wrapper.text()).not.toContain('Deine Vielfalt')
    await useSettings().update({ showColors: true })
  })
})

describe('VarietyView', () => {
  it('explains the colours, links back to the week, and renders the week table and the month mosaic', async () => {
    const { wrapper } = await mountView(VarietyView, '/vielfalt')
    const total = useTiles().visibleTiles.value.length
    expect(wrapper.find('h1').text()).toBe('Deine Vielfalt')
    expect(wrapper.text()).toContain('Es gibt dabei kein richtig oder falsch.')
    const back = wrapper.find('a[aria-label="Zurück zur Woche"]')
    expect(back.attributes('href')).toBe('/woche')
    expect(wrapper.text()).toContain(`2 von ${total} Kacheln`)
    expect(wrapper.findAll('tbody tr')).toHaveLength(total)
    expect(wrapper.findAll('.mosaic__day').length).toBeGreaterThanOrEqual(28)
    expect(wrapper.find('.mosaic__day--today').text()).toMatch(/Obst, Brot/)
  })
})

describe('TreePageView', () => {
  it('shows the leaf count, next milestones and the fresh-leaf status', async () => {
    const { wrapper } = await mountView(TreePageView, '/baum')
    expect(wrapper.find('h2').text()).toBe('1 Blatt')
    expect(wrapper.text()).toContain('Nächste Blüte in 6 Blättern, erster Apfel in 29')
    expect(wrapper.find('[role="status"]').text()).toBe('Das Blatt von heute ist da. Es hat einen weißen Rand.')
    const tree = wrapper.find('tree-view-stub')
    expect(tree.attributes('leaves')).toBe('1')
    expect(tree.attributes('fresh')).toBe('true')
    expect(tree.attributes('seed')).toBe('42')
  })
})
