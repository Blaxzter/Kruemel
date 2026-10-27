import { expect, test, type Page } from '@playwright/test'

/** Onboarding checks from the field test: screen height, the tree, install help, dark status bar. */

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

/** Viewports as 100dvh sees them, including phones with the browser bars showing. */
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 560 },
  { width: 360, height: 640 },
  { width: 390, height: 664 },
  { width: 412, height: 915 },
]

/** The page never scrolls and the step's main button sits fully on screen. */
async function expectFitsScreen(page: Page, label: string): Promise<void> {
  const button = page.getByTestId('intro-next').or(page.getByTestId('intro-finish'))
  await expect(button).toBeVisible()
  const { scrollHeight, innerHeight } = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }))
  expect(scrollHeight, `${label}: page scroll height`).toBeLessThanOrEqual(innerHeight)
  const box = (await button.boundingBox())!
  expect(box.y + box.height, `${label}: button bottom`).toBeLessThanOrEqual(innerHeight)
  expect(box.y, `${label}: button top`).toBeGreaterThanOrEqual(0)
}

for (const ios of [false, true]) {
  test.describe(ios ? 'with an iOS user agent' : 'in Chrome', () => {
    if (ios) test.use({ userAgent: IOS_UA })

    for (const viewport of VIEWPORTS) {
      test(`every step fits ${viewport.width}x${viewport.height} with the button on screen`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.goto('/willkommen')
        for (let step = 1; step <= 4; step++) {
          await expect(page.getByRole('img', { name: `Schritt ${step} von 4` })).toBeVisible()
          await expectFitsScreen(page, `step ${step}`)
          // The only hint that tiles can be edited: never dropped on short screens.
          if (step === 2) await expect(page.getByTestId('intro-hold-hint')).toBeInViewport({ ratio: 1 })
          if (step < 4) await page.getByTestId('intro-next').click()
        }
        await expect(page.getByTestId(ios ? 'ios-guide' : 'install-guide')).toBeVisible()
      })
    }
  })
}

test('on a tall phone the pictures keep their design size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/willkommen')
  for (let step = 1; step <= 4; step++) {
    await expect(page.getByTestId('intro-art')).toHaveAttribute('data-fit', '1.00')
    if (step < 4) await page.getByTestId('intro-next').click()
  }
})

test('the tree step shows a grown tree, not a sapling', async ({ page }) => {
  await page.goto('/willkommen')
  for (let i = 0; i < 2; i++) await page.getByTestId('intro-next').click()
  await expect(page.getByRole('heading', { name: 'Dein Baum' })).toBeVisible()
  const tree = page.getByTestId('tree-view')
  // It grows in over 1.5 s and ends with a full crown with flowers and apples.
  await expect(tree).toHaveAttribute('data-leaves', '180', { timeout: 5_000 })
  const box = (await tree.boundingBox())!
  expect(box.height).toBeGreaterThan(250)
})

test('in landscape the tree step still shows the tree', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/willkommen')
  for (let i = 0; i < 2; i++) await page.getByTestId('intro-next').click()
  await expect(page.getByRole('heading', { name: 'Dein Baum' })).toBeVisible()
  const art = page.getByTestId('intro-art')
  await expect.poll(async () => Number(await art.getAttribute('data-fit'))).toBeGreaterThan(0)
  await expect.poll(async () => (await page.getByTestId('tree-view').boundingBox())?.height ?? 0).toBeGreaterThan(100)
  await expectFitsScreen(page, 'landscape tree step')
})

test('without an install prompt the install step explains the Chrome menu and offers "Später"', async ({ page }) => {
  await page.goto('/willkommen')
  await page.getByRole('button', { name: 'Überspringen' }).click()
  const guide = page.getByTestId('install-guide')
  await expect(guide).toContainText('Tipp oben rechts auf ⋮')
  await page.getByTestId('intro-finish').click()
  await expect(page).toHaveURL(/\/$/)

  // Installing stays possible later, from the settings.
  await page.goto('/einstellungen')
  await page.getByTestId('settings-install').click()
  await expect(page.getByRole('dialog').getByTestId('install-guide')).toBeVisible()
})

test.describe('dark system theme', () => {
  test.use({ colorScheme: 'dark' })

  test('the browser gets the dark ground as theme colour from the first paint', async ({ page }) => {
    await page.goto('/willkommen')
    const colors = await page.locator('meta[name="theme-color"]').evaluateAll((metas) =>
      metas.map((m) => ({ media: m.getAttribute('media'), content: m.getAttribute('content') })),
    )
    expect(colors).toEqual([
      { media: '(prefers-color-scheme: light)', content: '#F6F3FF' },
      { media: '(prefers-color-scheme: dark)', content: '#15122A' },
    ])
    const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(ground).toBe('rgb(21, 18, 42)')
  })

  test('a forced light theme sets both theme colours to light', async ({ page }) => {
    await page.goto('/willkommen')
    await page.getByRole('button', { name: 'Überspringen' }).click()
    await page.getByTestId('intro-finish').click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/einstellungen')
    await page.getByRole('radio', { name: 'Hell' }).check({ force: true })
    await expect
      .poll(() => page.locator('meta[name="theme-color"]').evaluateAll((metas) => metas.map((m) => m.getAttribute('content'))))
      .toEqual(['#F6F3FF', '#F6F3FF'])
  })
})
