import { expect, test, type Page } from '@playwright/test'

/**
 * Tile edit mode on Today with real touch input (Pixel 7 touch profile).
 * Gestures go through the DevTools protocol. Follow-up taps use click(): headless Chromium often
 * drops the click of a Playwright tap() right after a synthetic CDP touch gesture (also on the
 * build without edit mode), which is a test harness quirk, not app behaviour.
 */

// The wiggle keeps tiles moving, which Playwright reads as "not stable"; one test checks it separately.
test.use({ reducedMotion: 'reduce' })

async function finishOnboarding(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page).toHaveURL(/\/willkommen$/)
  await page.getByRole('button', { name: 'Überspringen' }).click()
  await page.getByTestId('intro-finish').click()
  await expect(page).toHaveURL(/\/$/)
}

async function center(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = (await page.locator(selector).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Finger down, an optional rest, moves along `path`, finger up: touch and pointer events like a real finger. */
async function touch(page: Page, from: { x: number; y: number }, opts: { holdMs?: number; path?: { x: number; y: number }[] } = {}): Promise<void> {
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] })
  if (opts.holdMs) await page.waitForTimeout(opts.holdMs)
  for (const p of opts.path ?? []) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y }] })
    await page.waitForTimeout(16)
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
}

function steps(from: { x: number; y: number }, to: { x: number; y: number }, n = 12): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => ({ x: from.x + ((to.x - from.x) * (i + 1)) / n, y: from.y + ((to.y - from.y) * (i + 1)) / n }))
}

const tileOrder = (page: Page) => page.locator('[data-testid="tile-grid"] [data-tile]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.tile))

test('long press -> edit -> rename -> Fertig', async ({ page }) => {
  await finishOnboarding(page)
  const grid = page.getByTestId('tile-grid')
  await touch(page, await center(page, '[data-tile="fruit"]'), { holdMs: 750 })
  await expect(grid).toHaveAttribute('data-editing', 'true')
  await expect(page.getByTestId('edit-bar')).toContainText('Kacheln bearbeiten')
  // The long press logged nothing.
  await expect(page.locator('[data-testid="tile-badge"]')).toHaveCount(0)
  await expect(page.getByText('Obst eingetragen')).toHaveCount(0)

  await page.getByRole('button', { name: 'Obst bearbeiten' }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  await sheet.locator('#tile-editor-name').fill('Äpfel & Co')
  await sheet.getByRole('button', { name: 'Speichern' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Äpfel & Co bearbeiten' })).toBeVisible()

  await page.getByTestId('edit-done').click()
  await expect(grid).not.toHaveAttribute('data-editing', 'true')
  await page.getByRole('button', { name: /^Äpfel & Co/ }).click()
  await expect(page.getByText('Äpfel & Co eingetragen', { exact: true })).toBeVisible()

  // Survives a reload.
  await page.reload()
  await expect(page.getByRole('button', { name: /^Äpfel & Co/ })).toBeVisible()
})

test('a short tap still logs, and a scroll on a tile does not enter edit mode', async ({ page }) => {
  await finishOnboarding(page)
  const from = await center(page, '[data-tile="veg"]')
  await touch(page, from, { path: steps(from, { x: from.x, y: from.y - 60 }, 6) })
  await page.waitForTimeout(700)
  await expect(page.getByTestId('tile-grid')).not.toHaveAttribute('data-editing', 'true')
  await expect(page.locator('[data-testid="tile-badge"]')).toHaveCount(0)
  await page.getByRole('button', { name: /^Gemüse/ }).click()
  await expect(page.getByRole('button', { name: /^Gemüse/ })).toHaveAccessibleName('Gemüse, heute einmal')
})

test('drag to reorder in edit mode, persisted after reload', async ({ page }) => {
  await finishOnboarding(page)
  expect((await tileOrder(page)).slice(0, 3)).toEqual(['fruit', 'veg', 'bread'])
  await touch(page, await center(page, '[data-tile="fruit"]'), { holdMs: 750 })
  await expect(page.getByTestId('tile-grid')).toHaveAttribute('data-editing', 'true')

  const from = await center(page, '[data-tile="fruit"]')
  const to = await center(page, '[data-tile="meal"]')
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  // Rest the finger first: in edit mode a swipe that moves right away scrolls the page.
  await page.waitForTimeout(350)
  for (const p of steps(from, to)) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] })
    await page.waitForTimeout(16)
  }
  // Mid drag: a floating copy follows the finger and the slot shows where it lands.
  await expect(page.getByTestId('tile-ghost')).toBeVisible()
  await expect(page.locator('[data-tile="fruit"].tile--placeholder')).toHaveCount(1)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()

  await expect(page.getByTestId('tile-ghost')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByTestId('tile-grid')).not.toHaveAttribute('aria-busy', 'true')
  await expect.poll(async () => (await tileOrder(page)).slice(0, 4)).toEqual(['veg', 'bread', 'meal', 'fruit'])
  await expect(page.locator('[data-testid="tile-badge"]')).toHaveCount(0)

  await page.reload()
  await expect.poll(async () => (await tileOrder(page)).slice(0, 4)).toEqual(['veg', 'bread', 'meal', 'fruit'])
})

test('in edit mode a quick swipe on a tile scrolls and never moves it', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await finishOnboarding(page)
  await touch(page, await center(page, '[data-tile="fruit"]'), { holdMs: 750 })
  await expect(page.getByTestId('tile-grid')).toHaveAttribute('data-editing', 'true')
  const before = await tileOrder(page)
  const from = await center(page, '[data-tile="dairy"]')
  await touch(page, from, { path: steps(from, { x: from.x, y: from.y - 200 }, 10) })
  await expect(page.getByTestId('tile-ghost')).toHaveCount(0)
  expect(await tileOrder(page)).toEqual(before)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await page.reload()
  expect(await tileOrder(page)).toEqual(before)
})

test('long press then drag in one gesture moves the tile', async ({ page }) => {
  await finishOnboarding(page)
  const from = await center(page, '[data-tile="drink"]')
  const to = await center(page, '[data-tile="fruit"]')
  await touch(page, from, { holdMs: 750, path: steps(from, to, 14) })
  await expect(page.getByTestId('tile-grid')).toHaveAttribute('data-editing', 'true')
  await expect.poll(async () => (await tileOrder(page))[0]).toBe('drink')
})

test('keyboard: Shift+F10 enters edit mode, Esc leaves it', async ({ page }) => {
  await finishOnboarding(page)
  await page.locator('[data-tile="bread"]').focus()
  await page.keyboard.press('Shift+F10')
  await expect(page.getByTestId('tile-grid')).toHaveAttribute('data-editing', 'true')
  await expect(page.locator('[data-tile="bread"]')).toHaveAccessibleName('Brot bearbeiten')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('tile-grid')).not.toHaveAttribute('data-editing', 'true')
})

test.describe('motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('tiles wiggle in edit mode, but not with reduced motion', async ({ page }) => {
    await finishOnboarding(page)
    await page.locator('[data-tile="fruit"]').focus()
    await page.keyboard.press('Shift+F10')
    const name = () => page.locator('[data-tile="fruit"]').evaluate((el) => getComputedStyle(el).animationName)
    await expect.poll(name).toMatch(/tile-wiggle/)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(name).toBe('none')
  })
})
