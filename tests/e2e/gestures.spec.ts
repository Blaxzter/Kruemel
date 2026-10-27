import { expect, test, type Page } from '@playwright/test'

/** Touch gestures and dismissal of the Reka based bottom sheet and toast (Pixel 7 touch profile). */

async function finishOnboarding(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page).toHaveURL(/\/willkommen$/)
  await page.getByRole('button', { name: 'Überspringen' }).click()
  // The install step: no browser prompt in tests, so "Später" finishes.
  await page.getByTestId('intro-finish').click()
  await expect(page).toHaveURL(/\/$/)
}

/** A real touch drag through the DevTools protocol (fires touch and pointer events like a finger). */
async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 10): Promise<void> {
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] })
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps
    const y = from.y + ((to.y - from.y) * i) / steps
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
    await page.waitForTimeout(16)
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
}

async function center(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = (await page.locator(selector).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function openPartSheet(page: Page) {
  await page.getByRole('button', { name: /^Obst/ }).click()
  await expect(page.getByRole('button', { name: /^Obst/ })).toHaveAccessibleName('Obst, heute einmal')
  const opener = page.getByRole('button', { name: /, 1 Eintrag, öffnen$/ })
  await opener.click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0)
  return { sheet, opener }
}

test('swiping a sheet down closes it and returns focus to the opener', async ({ page }) => {
  await finishOnboarding(page)
  const { sheet, opener } = await openPartSheet(page)
  // Start on the title (buttons do not start a drag), drag a good part of the sheet height down.
  const from = await center(page, '[role="dialog"] .sheet__title')
  await swipe(page, from, { x: from.x, y: from.y + 260 })
  await expect(sheet).toHaveCount(0)
  await expect(opener).toBeFocused()
  await expect(page.locator('#app')).not.toHaveAttribute('aria-hidden', 'true')
})

test('a short drag springs the sheet back instead of closing it', async ({ page }) => {
  await finishOnboarding(page)
  const { sheet } = await openPartSheet(page)
  const from = await center(page, '[role="dialog"] .sheet__title')
  await swipe(page, from, { x: from.x, y: from.y + 12 }, 6)
  await page.waitForTimeout(400)
  await expect(sheet).toBeVisible()
  await expect(sheet).toHaveAttribute('data-state', 'open')
})

/** Like swipe(), but slow, and the finger rests before it lifts (release velocity about 0). */
async function slowPull(page: Page, from: { x: number; y: number }, dy: number): Promise<void> {
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] })
  const steps = 30
  for (let i = 1; i <= steps; i++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x, y: from.y + (dy * i) / steps }] })
    await page.waitForTimeout(30)
  }
  await page.waitForTimeout(400)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
}

test('a slow pull of a fraction of the sheet height, held before letting go, springs back', async ({ page }) => {
  await finishOnboarding(page)
  const { sheet } = await openPartSheet(page)
  const height = (await sheet.boundingBox())!.height
  // Well past Reka's fixed 40px default, but less than half of this (short) sheet.
  const pull = Math.round(Math.min(60, height * 0.4))
  expect(pull).toBeGreaterThan(40)
  const from = await center(page, '[role="dialog"] .sheet__title')
  await slowPull(page, from, pull)
  await page.waitForTimeout(400)
  await expect(sheet).toHaveAttribute('data-state', 'open')
  // Back in place, not left hanging where the finger let go. Measured in the page: Playwright's
  // boundingBox() can disagree with the layout box here (it reported the sheet 60px low while a
  // screenshot showed it back at the bottom edge).
  await expect.poll(() => sheet.evaluate((el) => Math.round(el.getBoundingClientRect().bottom - window.innerHeight))).toBe(0)
})

test('an upward drag does not lift the sheet off the bottom edge', async ({ page }) => {
  await finishOnboarding(page)
  const { sheet } = await openPartSheet(page)
  const from = await center(page, '[role="dialog"] .sheet__title')
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  for (let i = 1; i <= 6; i++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x, y: from.y - i * 10 }] })
    await page.waitForTimeout(16)
  }
  const box = (await sheet.boundingBox())!
  expect(Math.round(box.y + box.height)).toBe(844)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
  await expect(sheet).toHaveAttribute('data-state', 'open')
})

test('a tall sheet stays below the status bar / notch', async ({ page }) => {
  await finishOnboarding(page)
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34 } })
  for (let i = 0; i < 14; i++) await page.getByRole('button', { name: /^Obst/ }).click()
  await page.getByRole('button', { name: /, 14 Einträge, öffnen$/ }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0)
  const sheetTop = (await sheet.boundingBox())!.y
  const handleTop = (await sheet.locator('.sheet__handle').boundingBox())!.y
  expect(sheetTop).toBeGreaterThanOrEqual(47 + 12 - 0.5)
  expect(handleTop).toBeGreaterThan(47)
  await client.detach()
})

test('a backdrop tap and Esc close the sheet', async ({ page }) => {
  await finishOnboarding(page)
  const { sheet, opener } = await openPartSheet(page)
  await page.getByTestId('sheet-backdrop').click({ position: { x: 20, y: 20 } })
  await expect(sheet).toHaveCount(0)
  await expect(opener).toBeFocused()

  await opener.click()
  await expect(sheet).toBeVisible()
  // Initial focus is on "Fertig", never on a delete button.
  await expect(sheet.getByRole('button', { name: 'Fertig' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('the page behind an open sheet does not scroll', async ({ page }) => {
  await finishOnboarding(page)
  await openPartSheet(page)
  const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow)
  expect(overflow).toBe('hidden')
})

test('swiping the toast to the right dismisses it without undoing', async ({ page }) => {
  await finishOnboarding(page)
  const fruit = page.getByRole('button', { name: /^Obst/ })
  await fruit.click()
  const region = page.getByRole('region', { name: 'Hinweise' })
  await expect(region).toContainText('Obst eingetragen')
  await expect.poll(() => page.locator('.toast').evaluate((el) => el.getAnimations().length)).toBe(0)

  const from = await center(page, '.toast__text')
  await swipe(page, from, { x: from.x + 200, y: from.y })
  await expect(page.locator('.toast')).toHaveCount(0)
  await expect(fruit).toHaveAccessibleName('Obst, heute einmal')
})

test('the toast inside an open sheet can be swiped away too', async ({ page }) => {
  await finishOnboarding(page)
  const { sheet } = await openPartSheet(page)
  await sheet.getByRole('button', { name: /^Obst um \d{1,2}:\d{2} löschen$/ }).click()
  const toast = sheet.locator('.toast[data-state="open"]')
  await expect(toast).toContainText('Obst gelöscht')
  await expect.poll(() => toast.evaluate((el) => el.getAnimations().length)).toBe(0)
  const from = await center(page, '[role="dialog"] .toast[data-state="open"] .toast__text')
  await swipe(page, from, { x: from.x + 200, y: from.y })
  await expect(sheet.locator('.toast')).toHaveCount(0)
  // Only the toast went away; the sheet stays open.
  await expect(sheet).toHaveAttribute('data-state', 'open')
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the sheet fades instead of sliding', async ({ page }) => {
    await finishOnboarding(page)
    await page.getByRole('button', { name: /^Obst/ }).click()
    await page.getByRole('button', { name: /, 1 Eintrag, öffnen$/ }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    expect(await sheet.evaluate((el) => getComputedStyle(el).animationName)).toMatch(/^backdrop-in/)
  })

  test('the sheet really fades: its opacity passes through in-between values', async ({ page }) => {
    await finishOnboarding(page)
    await page.getByRole('button', { name: /^Obst/ }).click()
    // Pause the fade the moment the sheet is inserted: on a busy machine it can be over before
    // the test gets to look at it.
    await page.evaluate(() => {
      const observer = new MutationObserver(() => {
        const el = document.querySelector('[role="dialog"]')
        if (!el) return
        observer.disconnect()
        for (const a of el.getAnimations()) a.pause()
      })
      observer.observe(document.body, { childList: true, subtree: true })
    })
    await page.getByRole('button', { name: /, 1 Eintrag, öffnen$/ }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toHaveCount(1)
    // Sample the fade early on (the global reduced-motion rule must not cut it to 0.01ms).
    const mid = await sheet.evaluate((el) => {
      const [fade] = el.getAnimations()
      if (!fade) return null
      fade.pause()
      fade.currentTime = Number(fade.effect?.getTiming().duration) / 8
      const opacity = Number(getComputedStyle(el).opacity)
      fade.finish()
      return { duration: fade.effect?.getTiming().duration, opacity }
    })
    expect(mid).not.toBeNull()
    expect(mid!.duration).toBe(280)
    expect(mid!.opacity).toBeGreaterThan(0)
    expect(mid!.opacity).toBeLessThan(0.95)
  })
})
