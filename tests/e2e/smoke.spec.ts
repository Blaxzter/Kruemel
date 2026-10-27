import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/** Name of the app's IndexedDB database (src/db/db.ts). */
const DB_NAME = 'kruemel'

/** Walks the 4-step onboarding: "Überspringen" jumps to the install step, "Später" finishes. */
async function finishOnboarding(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page).toHaveURL(/\/willkommen$/)
  await page.getByRole('button', { name: 'Überspringen' }).click()
  // The install step: no browser prompt in tests, so "Später" finishes.
  await page.getByTestId('intro-finish').click()
  await expect(page).toHaveURL(/\/$/)
}

/** Number of rows in the IndexedDB `entries` table, read without the app's code. */
function storedEntryCount(page: Page): Promise<number> {
  return page.evaluate(
    (dbName) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open(dbName)
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const req = open.result.transaction('entries').objectStore('entries').count()
          req.onsuccess = () => {
            open.result.close()
            resolve(req.result)
          }
          req.onerror = () => reject(req.error)
        }
      }),
    DB_NAME,
  )
}

function fruitTile(page: Page) {
  return page.getByRole('button', { name: /^Obst/ })
}

test('first visit goes to onboarding, finishing it opens Today with the bottom nav', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/willkommen$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')

  // Step 1 asks for the name; walk every step with "Weiter".
  await page.getByLabel('Wie soll die App dich nennen?').fill('Mia')
  for (let i = 0; i < 3; i++) await page.getByTestId('intro-next').click()
  await page.getByTestId('intro-finish').click()
  await expect(page).toHaveURL(/\/$/)

  await expect(page.getByText('Mia')).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Hauptmenü' })
  await expect(nav.getByRole('link', { name: 'Heute' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link')).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'Kacheln' }).getByRole('button')).toHaveCount(8)
})

test('logging, undo, persistence, tree, week and language switch', async ({ page }) => {
  await finishOnboarding(page)

  // Tap "Obst": toast + badge.
  await fruitTile(page).click()
  const toasts = page.getByRole('region', { name: 'Hinweise' })
  await expect(toasts).toContainText('Obst eingetragen')
  await expect(fruitTile(page)).toHaveAccessibleName('Obst, heute einmal')

  // Undo removes it again.
  await toasts.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(fruitTile(page)).toHaveAccessibleName('Obst')
  await expect(fruitTile(page).getByTestId('tile-badge')).toHaveCount(0)

  // Tap again and reload: the entry is kept in IndexedDB.
  await fruitTile(page).click()
  await expect(fruitTile(page)).toHaveAccessibleName('Obst, heute einmal')
  // The badge is shown optimistically; wait until the write has reached IndexedDB.
  await expect.poll(() => storedEntryCount(page)).toBe(1)
  await page.reload()
  await expect(fruitTile(page)).toHaveAccessibleName('Obst, heute einmal')

  // Tree pill counts one leaf and leads to the tree page.
  const pill = page.getByTestId('tree-pill')
  await expect(pill).toHaveAccessibleName('Mein Baum, 1 Blatt')
  await pill.click()
  await expect(page).toHaveURL(/\/baum$/)
  await expect(page.getByRole('heading', { name: '1 Blatt' })).toBeVisible()
  await expect(page.getByTestId('tree-view')).toHaveAttribute('data-leaves', '1')

  // Week shows today, selected, with the entry.
  await page.goto('/woche')
  const strip = page.getByRole('region', { name: 'Die letzten 7 Tage' })
  const todayButton = strip.getByRole('button', { pressed: true })
  await expect(todayButton).toContainText('Heute')
  await expect(todayButton).toHaveAccessibleName(/1 Eintrag$/)
  await expect(page.getByText('Obst').first()).toBeVisible()

  // Settings: switch to English, the nav follows.
  await page.goto('/einstellungen')
  await page.getByText('English', { exact: true }).click()
  await expect(page.getByRole('radio', { name: 'English' })).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  // The tab title follows the language without a navigation.
  await expect(page).toHaveTitle(/^Settings · /)
  await page.getByRole('link', { name: /Back/ }).first().click()
  const nav = page.getByRole('navigation', { name: 'Main menu' })
  await expect(nav.getByRole('link', { name: 'Today' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Week' })).toBeVisible()

  // The choice survives a reload.
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Main menu' })).toBeVisible()
})

test('switching Vielfalt off hides the Week card and the route', async ({ page }) => {
  await finishOnboarding(page)
  await page.goto('/einstellungen')
  await page.getByRole('switch', { name: /Vielfalt/ }).click()
  await expect(page.getByRole('switch', { name: /Vielfalt/ })).toHaveAttribute('aria-checked', 'false')
  // In-app navigation first: a full page load right after the tap could beat the settings write.
  await page.getByRole('link', { name: 'Zurück zu Heute' }).first().click()
  await page.getByRole('navigation', { name: 'Hauptmenü' }).getByRole('link', { name: 'Woche' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Deine Woche' })).toBeVisible()
  await expect(page.getByTestId('variety-card')).toHaveCount(0)
  await page.goto('/vielfalt')
  await expect(page).toHaveURL(/\/$/)
})

test('switching Mein Baum off hides the pill and the tree page', async ({ page }) => {
  await finishOnboarding(page)
  await expect(page.getByTestId('tree-pill')).toBeVisible()
  await page.goto('/einstellungen')
  await page.getByRole('switch', { name: /Mein Baum/ }).click()
  await expect(page.getByRole('switch', { name: /Mein Baum/ })).toHaveAttribute('aria-checked', 'false')
  await page.goto('/baum')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('tree-pill')).toHaveCount(0)
})

test('dark theme applies to the document', async ({ page }) => {
  await finishOnboarding(page)
  await page.goto('/einstellungen')
  await page.getByText('Dunkel', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).not.toBe('rgb(246, 243, 255)')
})

test('serves a web app manifest', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.name).toBe('Krümel')
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/')
  expect(manifest.id).toBe('/')
})

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' })

  test('reloads offline once the service worker is installed', async ({ page, context }) => {
    await finishOnboarding(page)
    await fruitTile(page).click()
    await expect(fruitTile(page)).toHaveAccessibleName('Obst, heute einmal')
    await expect.poll(() => storedEntryCount(page)).toBe(1)

    // Wait for the precache to finish (the worker turns active when install completed).
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (reg.active?.state === 'activated') return
      await new Promise<void>((resolve) => reg.active?.addEventListener('statechange', () => resolve()))
    })

    await context.setOffline(true)
    await page.reload()
    await expect(fruitTile(page)).toHaveAccessibleName('Obst, heute einmal')
    await page.goto('/woche')
    await expect(page.getByRole('region', { name: 'Die letzten 7 Tage' })).toBeVisible()
    await context.setOffline(false)
  })

  test('the first visit can open lazy pages offline without a reload', async ({ page, context }) => {
    await finishOnboarding(page)
    // clientsClaim: the worker takes control of the page that installed it.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (navigator.serviceWorker.controller) return
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve()))
    })

    await context.setOffline(true)
    await page.getByRole('navigation', { name: 'Hauptmenü' }).getByRole('link', { name: 'Woche' }).click()
    await expect(page).toHaveURL(/\/woche$/)
    await expect(page.getByRole('region', { name: 'Die letzten 7 Tage' })).toBeVisible()
    await context.setOffline(false)
  })
})

test('describe mode saves a note and offers it again next time', async ({ page }) => {
  await finishOnboarding(page)
  await page.goto('/einstellungen')
  await page.getByText('Kurz beschreiben', { exact: true }).click()
  await expect(page.getByRole('radio', { name: /Kurz beschreiben/ })).toBeChecked()
  await page.getByRole('link', { name: 'Zurück zu Heute' }).first().click()

  await page.getByRole('button', { name: /^Brot/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Brot' })
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('Gerade eben')
  await sheet.getByLabel(/Was war es\?/).fill('Toast mit Käse')
  await sheet.getByRole('button', { name: 'Lecker' }).click()
  await sheet.getByRole('button', { name: 'Speichern' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('region', { name: 'Hinweise' })).toContainText('Brot eingetragen')
  await expect(page.getByRole('button', { name: /^Brot/ })).toHaveAccessibleName('Brot, heute einmal')

  await page.getByRole('button', { name: /^Brot/ }).click()
  await expect(sheet.getByRole('button', { name: 'Toast mit Käse' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Nur eintragen' }).click()
  await expect(page.getByRole('button', { name: /^Brot/ })).toHaveAccessibleName('Brot, heute 2-mal')
})

test('a custom tile created from "Eigene" can be logged on Today', async ({ page }) => {
  await finishOnboarding(page)
  await page.getByTestId('custom-tile').click()
  const sheet = page.getByRole('dialog', { name: 'Neue Kachel' })
  await expect(sheet).toBeVisible()
  await sheet.getByLabel('Name', { exact: true }).fill('Suppe')
  await sheet.getByRole('button', { name: 'Zu meinen Kacheln' }).click()
  await expect(page).toHaveURL(/\/$/)

  const soup = page.getByRole('button', { name: /^Suppe/ })
  await expect(soup).toBeVisible()
  await soup.click()
  await expect(page.getByRole('region', { name: 'Hinweise' })).toContainText('Suppe eingetragen')
  await page.reload()
  await expect(soup).toHaveAccessibleName('Suppe, heute einmal')
})

test('deleting from a part of the day can be undone', async ({ page }) => {
  await finishOnboarding(page)
  await fruitTile(page).click()
  await expect(fruitTile(page)).toHaveAccessibleName('Obst, heute einmal')

  await page.getByRole('button', { name: /, 1 Eintrag, öffnen$/ }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('button', { name: /^Obst um \d{1,2}:\d{2} löschen$/ }).click()
  await expect(sheet).toContainText('Hier ist noch nichts eingetragen.')
  const toasts = page.getByRole('region', { name: 'Hinweise' })
  await expect(toasts).toContainText('Obst gelöscht')
  // The page behind the sheet is hidden from assistive tech, the toast is inside the sheet
  // (so it stays reachable) and does not cover the sheet's "Fertig".
  await expect(page.locator('#app')).toHaveAttribute('aria-hidden', 'true')
  await expect(sheet.getByRole('region', { name: 'Hinweise' })).toContainText('Obst gelöscht')
  const done = sheet.getByRole('button', { name: 'Fertig' })
  const doneBox = (await done.boundingBox())!
  const toastBox = (await page.locator('.toast[data-state="open"]').boundingBox())!
  expect(doneBox.y + doneBox.height).toBeLessThanOrEqual(toastBox.y)
  // Keyboard users reach "Rückgängig" from inside the sheet's focus trap.
  await done.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(toasts.getByRole('button', { name: 'Rückgängig' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(sheet.getByRole('button', { name: /^Obst um/ })).toBeVisible()
  await expect.poll(() => storedEntryCount(page)).toBe(1)
})

/** Headers of the `/*` rule in public/_headers (what Cloudflare sends with every response). */
function deployHeaders(): Record<string, string> {
  const lines = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8').split(/\r?\n/)
  const start = lines.indexOf('/*')
  const headers: Record<string, string> = {}
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break
    const i = line.indexOf(':')
    headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim()
  }
  return headers
}

test('toasts are announced: their text is in the accessibility tree as a polite status', async ({ page }) => {
  await finishOnboarding(page)
  await fruitTile(page).click()
  // getByRole only sees what the accessibility tree exposes (aria-hidden nodes are left out).
  const status = page.getByRole('status')
  await expect(status).toHaveText('Obst eingetragen. Rückgängig mit Strg+Z')
  await expect(status).toHaveAttribute('aria-live', 'polite')
  expect(await page.locator('body').ariaSnapshot()).toContain('Obst eingetragen. Rückgängig mit Strg+Z')

  // Inside a modal sheet too, after a delete.
  await page.getByRole('button', { name: /, 1 Eintrag, öffnen$/ }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('button', { name: /^Obst um \d{1,2}:\d{2} löschen$/ }).click()
  await expect(sheet.getByRole('status')).toHaveText('Obst gelöscht. Rückgängig mit Strg+Z')
})

test('sheets on different routes never leave the app hidden from assistive tech', async ({ page }) => {
  await finishOnboarding(page)
  const app = page.locator('#app')
  await fruitTile(page).click()
  const openPart = async () => {
    await page.getByRole('button', { name: /, 1 Eintrag, öffnen$/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(app).toHaveAttribute('aria-hidden', 'true')
    await page.getByRole('dialog').getByRole('button', { name: 'Fertig' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(app).not.toHaveAttribute('aria-hidden')
  }
  const openBackup = async () => {
    await page.getByRole('button', { name: 'Tagebuch sichern' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(app).not.toHaveAttribute('aria-hidden')
  }

  await openPart()
  await page.getByRole('link', { name: 'Einstellungen' }).first().click()
  await expect(page).toHaveURL(/\/einstellungen$/)
  await openBackup()
  await page.getByRole('link', { name: 'Zurück zu Heute' }).click()
  await expect(page).toHaveURL(/\/$/)
  await openPart()
  await page.getByRole('link', { name: 'Einstellungen' }).first().click()
  await openBackup()
  await expect(page.getByRole('switch').first()).toBeVisible()
  await page.getByRole('link', { name: 'Zurück zu Heute' }).click()
  await expect(page.getByRole('region', { name: 'Kacheln' }).getByRole('button')).toHaveCount(8)
})

test('the app runs under the deployed security headers without CSP violations', async ({ page }) => {
  const headers = deployHeaders()
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['x-content-type-options']).toBe('nosniff')
  await page.route('**/*', async (route) => {
    try {
      const response = await route.fetch()
      await route.fulfill({ response, headers: { ...response.headers(), ...headers } })
    } catch (err) {
      // page.goto() below cancels requests still in flight (a lazy chunk, a font); their response
      // is gone by the time it would be fulfilled. Only that case is harmless.
      if (!/disposed|closed|cancel|abort/i.test(String(err))) throw err
    }
  })
  await page.addInitScript(() => {
    const w = window as unknown as { __cspViolations: string[] }
    w.__cspViolations = []
    document.addEventListener('securitypolicyviolation', (e) => w.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await finishOnboarding(page)
  await fruitTile(page).click()
  await expect(fruitTile(page)).toHaveAccessibleName('Obst, heute einmal')
  for (const path of ['/woche', '/baum', '/vielfalt', '/einstellungen', '/']) {
    await page.goto(path)
    await expect(page.locator('#app')).not.toBeEmpty()
  }
  expect(await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations)).toEqual([])
  expect(errors).toEqual([])
})
