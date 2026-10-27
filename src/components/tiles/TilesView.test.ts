import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { useTiles } from '@/stores'
import TilesView from '@/views/TilesView.vue'
import { inBody, mountView, resetSettings, settle } from '@/components/week/__tests__/testkit'

beforeEach(async () => {
  await resetSettings()
})

enableAutoUnmount(afterEach)

const sortedIds = () => [...useTiles().tiles.value].sort((a, b) => a.order - b.order).map((t) => t.id)

describe('TilesView', () => {
  it('moves tiles up and down', async () => {
    const { wrapper } = await mountView(TilesView, '/kacheln')
    const [first, second] = sortedIds()
    const rows = wrapper.findAll('[data-tile]')
    expect(rows.map((r) => r.attributes('data-tile'))).toEqual(sortedIds())
    expect(rows[0]!.find('[data-move="up"]').attributes('disabled')).toBeDefined()

    await rows[0]!.find('[data-move="down"]').trigger('click')
    await settle()
    expect(sortedIds().slice(0, 2)).toEqual([second, first])
    expect(wrapper.findAll('[data-tile]')[1]!.attributes('data-tile')).toBe(first)

    await wrapper.find(`[data-tile="${first}"] [data-move="up"]`).trigger('click')
    await settle()
    expect(sortedIds().slice(0, 2)).toEqual([first, second])
  })

  it('hides and shows a tile', async () => {
    const { wrapper } = await mountView(TilesView, '/kacheln')
    const { tiles, visibleTiles, tileLabel } = useTiles()
    const tile = [...tiles.value].sort((a, b) => a.order - b.order)[0]!
    const button = () => wrapper.find(`[data-tile="${tile.id}"] [data-action="visibility"]`)
    expect(button().attributes('aria-label')).toBe(`${tileLabel(tile)} ausblenden`)

    await button().trigger('click')
    await settle()
    expect(tiles.value.find((t) => t.id === tile.id)?.hidden).toBe(true)
    expect(visibleTiles.value.some((t) => t.id === tile.id)).toBe(false)
    expect(button().attributes('aria-label')).toBe(`${tileLabel(tile)} einblenden`)
    expect(wrapper.find(`[data-tile="${tile.id}"]`).text()).toContain('ausgeblendet')

    await button().trigger('click')
    await settle()
    expect(visibleTiles.value.some((t) => t.id === tile.id)).toBe(true)
  })

  it('opens the new tile sheet from ?neu=1 and adds the tile', async () => {
    const { router } = await mountView(TilesView, '/kacheln?neu=1')
    expect(router.currentRoute.value.query.neu).toBeUndefined()

    const dialog = inBody('[role="dialog"]')!
    expect(dialog.querySelector('h2')?.textContent).toBe('Neue Kachel')
    const input = dialog.querySelector<HTMLInputElement>('#tile-editor-name')!
    expect(document.activeElement).toBe(input)

    // Saving without a name asks for one.
    dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
    await settle()
    expect(inBody('#tile-editor-name-error')?.textContent).toContain('Namen')

    input.value = 'Nudeln'
    input.dispatchEvent(new Event('input'))
    inBody<HTMLButtonElement>('[aria-label="Pizza"]')!.click()
    inBody<HTMLButtonElement>('[aria-label="Minze"]')!.click()
    await settle()
    expect(inBody('[role="img"][aria-label="Vorschau: Nudeln"]')).not.toBeNull()

    inBody<HTMLButtonElement>('button[type="submit"]')!.click()
    await settle()

    const created = useTiles().tiles.value.find((t) => t.name === 'Nudeln')
    expect(created).toMatchObject({ builtinKey: null, icon: 'pizza', color: 'mint', hidden: false })
    expect(inBody('[role="dialog"]')).toBeNull()
    await useTiles().deleteTile(created!.id)
  })

  it('renames a builtin tile and resets it to the builtin name', async () => {
    const { wrapper } = await mountView(TilesView, '/kacheln')
    const { tiles } = useTiles()
    const fruit = () => tiles.value.find((t) => t.id === 'fruit')!

    await wrapper.find('[data-tile="fruit"] .tile-row__main').trigger('click')
    await settle()
    const input = inBody<HTMLInputElement>('#tile-editor-name')!
    expect(input.value).toBe('Obst')
    input.value = 'Früchte'
    input.dispatchEvent(new Event('input'))
    inBody<HTMLButtonElement>('button[type="submit"]')!.click()
    await settle()
    expect(fruit().name).toBe('Früchte')

    await wrapper.find('[data-tile="fruit"] .tile-row__main').trigger('click')
    await settle()
    const again = inBody<HTMLInputElement>('#tile-editor-name')!
    again.value = ''
    again.dispatchEvent(new Event('input'))
    inBody<HTMLButtonElement>('button[type="submit"]')!.click()
    await settle()
    expect(fruit().name).toBeNull()
  })
})
