import { expect, test } from '@playwright/test'

test.describe('home', () => {
  test('lists the six objects with prices from the catalog', async ({ page }) => {
    await page.goto('/')
    const objects = page.locator('section[aria-labelledby="objects-title"] > ul > li')
    await expect(objects).toHaveCount(6)
    await expect(objects.first()).toContainText('NACRE')
    await expect(objects.first()).toContainText('690 kr')
  })

  test('shows the next drop with a live countdown', async ({ page }) => {
    await page.goto('/')
    const drop = page.locator('section[aria-labelledby="drop-title"]')
    await expect(drop.getByRole('heading', { level: 2 })).toContainText('HALCYON')
    await expect(drop.getByText(/døgn/i).first()).toBeVisible()
  })

  test('reduced motion keeps the CSS object and never loads WebGL', async ({ page }, info) => {
    test.skip(info.project.name !== 'reduced-motion')
    await page.goto('/')
    await page.mouse.move(400, 400)
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(1500)
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.locator('.band-css').first()).toBeVisible()
  })

  test('the English reflection sits under the Norwegian manifesto', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('p[lang="en"]', { hasText: 'Not from here.' })).toHaveCount(1)
  })
})
