import { expect, test } from '@playwright/test'

test.describe('smoke', () => {
  test('Norwegian home renders at the root with correct lang and title', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'nb')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Laget et annet sted')
    await expect(page).toHaveTitle(/HYAL/)
  })

  test('English lives under /en', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Made elsewhere')
  })

  test('skip link moves focus to main content', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium')
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Hopp til innhold' })
    await expect(skip).toBeFocused()
    await skip.press('Enter')
    await expect(page.locator('#main')).toBeFocused()
  })

  test('unknown paths return a localised 404', async ({ page }) => {
    const res = await page.goto('/finnes-ikke')
    expect(res?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Dette stedet finnes ikke')
  })

  test('security headers are present', async ({ request }) => {
    const res = await request.get('/')
    const h = res.headers()
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['strict-transport-security']).toContain('max-age=')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })
})
