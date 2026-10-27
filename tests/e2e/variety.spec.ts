import { expect, test, type Page } from '@playwright/test'

/** Skips the onboarding: "Überspringen" jumps to the install step, "Später" finishes. */
async function finishOnboarding(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page).toHaveURL(/\/willkommen$/)
  await page.getByRole('button', { name: 'Überspringen' }).click()
  await page.getByTestId('intro-finish').click()
  await expect(page).toHaveURL(/\/$/)
}

test('the Week card opens Vielfalt, and its back link returns to the Week', async ({ page }) => {
  await finishOnboarding(page)
  await page.getByRole('button', { name: /^Obst/ }).click()

  const nav = page.getByRole('navigation', { name: 'Hauptmenü' })
  await expect(nav.getByRole('link')).toHaveCount(2)
  await nav.getByRole('link', { name: 'Woche' }).click()
  await expect(page).toHaveURL(/\/woche$/)

  const card = page.getByRole('link', { name: /^Deine Vielfalt, 1 von \d+ Kacheln diese Woche$/ })
  await expect(card).toBeVisible()
  await expect(page.locator('.rosette__petal[data-filled="true"]')).toHaveCount(1)
  await card.click()

  await expect(page).toHaveURL(/\/vielfalt$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Deine Vielfalt' })).toBeVisible()
  await expect(page.getByText('Es gibt dabei kein richtig oder falsch.')).toBeVisible()
  await expect(page).toHaveTitle(/^Deine Vielfalt · /)
  // Not a tab any more: no bottom nav on this page.
  await expect(nav).toHaveCount(0)

  await page.getByRole('link', { name: 'Zurück zur Woche' }).click()
  await expect(page).toHaveURL(/\/woche$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Deine Woche' })).toBeVisible()
})

test('the old /farben address lands on Vielfalt', async ({ page }) => {
  await finishOnboarding(page)
  await page.goto('/farben')
  await expect(page).toHaveURL(/\/vielfalt$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Deine Vielfalt' })).toBeVisible()
})

test('a tap on the count in the middle of the rosette opens Vielfalt', async ({ page }) => {
  await finishOnboarding(page)
  await page.goto('/woche')
  const box = (await page.locator('.rosette__count').boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  expect(await page.evaluate(([px, py]) => document.elementFromPoint(px!, py!)?.closest('a')?.getAttribute('href') ?? null, [x, y])).toBe('/vielfalt')
  await page.touchscreen.tap(x, y)
  await expect(page).toHaveURL(/\/vielfalt$/)
})

test('the Week card and the Vielfalt page count the same tiles, hidden ones included', async ({ page }) => {
  await finishOnboarding(page)
  await page.getByRole('button', { name: /^Obst/ }).click()
  await expect(page.getByRole('button', { name: /^Obst/ })).toHaveAccessibleName('Obst, heute einmal')
  await page.getByRole('button', { name: /^Brot/ }).click()
  await expect(page.getByRole('button', { name: /^Brot/ })).toHaveAccessibleName('Brot, heute einmal')
  // Hide a tile that was logged this week: it keeps its colour on both screens.
  await page.goto('/kacheln')
  await page.getByRole('button', { name: 'Brot ausblenden' }).click()
  await expect(page.getByRole('button', { name: 'Brot einblenden' })).toBeVisible()
  await page.goto('/woche')
  const card = page.getByTestId('variety-card')
  const label = (await card.getAttribute('aria-label'))!
  const [, n, total] = label.match(/(\d+) von (\d+)/)!
  expect(n).toBe('2')
  await card.click()
  await expect(page).toHaveURL(/\/vielfalt$/)
  await expect(page.getByText(`${n} von ${total} Kacheln`)).toBeVisible()
})
