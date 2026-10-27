import { expect, test, type Page } from '@playwright/test'

/** Layout checks against the design frames (design/*.dc.html). */

async function finishOnboarding(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page).toHaveURL(/\/willkommen$/)
  await page.getByRole('button', { name: 'Überspringen' }).click()
  // The install step: no browser prompt in tests, so "Später" finishes.
  await page.getByTestId('intro-finish').click()
  await expect(page).toHaveURL(/\/$/)
}

test('pages use the top padding of their design frame', async ({ page }) => {
  await finishOnboarding(page)
  const shellPad = () => page.locator('.app-shell').evaluate((el) => getComputedStyle(el).paddingTop)
  expect(await shellPad()).toBe('28px')
  for (const [path, pad] of [
    ['/woche', '24px'],
    ['/vielfalt', '20px'],
    ['/baum', '20px'],
    ['/einstellungen', '20px'],
  ] as const) {
    await page.goto(path)
    await expect(page.locator('h1').first()).toBeVisible()
    expect(await shellPad(), path).toBe(pad)
  }
})

test('"Mein Baum" stays on one line at 360px; the time pill wraps instead', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await finishOnboarding(page)
  await page.goto('/baum')
  const title = page.getByRole('heading', { level: 1, name: 'Mein Baum' })
  await expect(title).toBeVisible()
  const lineHeight = await title.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3)
  const box = (await title.boundingBox())!
  expect(box.height).toBeLessThan(lineHeight * 1.5)
})

test('the describe sheet keeps 18px between header and the first field, without focusing the note', async ({ page }) => {
  await finishOnboarding(page)
  await page.goto('/einstellungen')
  await page.getByText('Kurz beschreiben', { exact: true }).click()
  await page.getByRole('link', { name: 'Zurück zu Heute' }).first().click()
  await page.getByRole('button', { name: /^Brot/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Brot' })
  await expect(sheet).toBeVisible()
  // Wait for the open transition to finish before measuring.
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
  const header = (await sheet.locator('.sheet__header').boundingBox())!
  const label = (await sheet.getByText('Was war es?').boundingBox())!
  expect(Math.round(label.y - (header.y + header.height))).toBe(18)
  await expect(sheet.getByLabel(/Was war es\?/)).not.toBeFocused()
})

test('Vielfalt week grid: one-line built-in labels and a 28px row pitch', async ({ page }) => {
  await finishOnboarding(page)
  await page.goto('/vielfalt')
  const names = page.locator('.grid__name')
  await expect(names.first()).toBeVisible()
  const heights = await names.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
  const single = Math.min(...heights)
  for (const h of heights) expect(h).toBeLessThan(single * 1.5)
  const rows = await page.locator('.grid tbody tr').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
  expect(Math.round(rows[1]! - rows[0]!)).toBe(28)
})
