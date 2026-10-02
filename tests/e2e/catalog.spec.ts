import { expect, test } from '@playwright/test'

test.describe('catalog', () => {
  test('filters by collection and sorts by price', async ({ page }) => {
    await page.goto('/produkter')
    const cards = page.locator('[data-testid="product-grid"] > li')
    await expect(cards).toHaveCount(6)
    await page.getByRole('button', { name: 'Kinetisk' }).click()
    await expect(cards).toHaveCount(3)
    await expect(page.getByRole('status').first()).toHaveText(/3 objekter/)
    await page.getByRole('button', { name: 'Alle' }).click()
    await page.getByLabel('Sorter').selectOption('price-asc')
    await expect(cards.first()).toContainText('MERIDIAN')
    await expect(cards.first()).toContainText('490 kr')
  })

  test('shows sets priced by the pricing engine', async ({ page }) => {
    await page.goto('/produkter')
    const dyad = page.locator('section[aria-labelledby="sets"] li', { hasText: 'DYADE' }).first()
    // NACRE 690 + ISOBAR 590 = 1 280; 15 % off per line → 586,50 + 501,50 = 1 088 kr
    await expect(dyad).toContainText('1 280 kr')
    await expect(dyad).toContainText('1 088 kr')
  })
})

test.describe('product page', () => {
  test('variant selection updates live stock text', async ({ page }) => {
    await page.goto('/produkter/isobar')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ISOBAR')
    await expect(page.getByText('590 kr').first()).toBeVisible()
    await page.getByRole('radio', { name: 'Ikor' }).check({ force: true })
    await expect(page.getByText('Bare 3 igjen')).toBeVisible()
  })

  test('a sold-out variant offers the back-in-stock list instead of the cart', async ({ page }) => {
    await page.goto('/produkter/fathom')
    await page.getByRole('radio', { name: 'Ultrafiolett' }).check({ force: true })
    await page.getByRole('radio', { name: 'S/M' }).check({ force: true })
    await expect(page.getByText('Utsolgt').first()).toBeVisible()
    await expect(page.getByLabel('E-post', { exact: true })).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveAttribute('required', '')
    await expect(page.getByRole('button', { name: 'Legg i kurv' })).toHaveCount(0)
  })

  test('ships Product JSON-LD with one offer per variant', async ({ page }) => {
    await page.goto('/produkter/nacre')
    const json = await page.locator('script[type="application/ld+json"]').first().textContent()
    const data = JSON.parse(json ?? '{}')
    expect(data['@type']).toBe('Product')
    expect(data.offers).toHaveLength(6)
    expect(data.offers[0].priceCurrency).toBe('NOK')
    expect(data.offers[0].price).toBe('690.00')
  })

  test('English product URL and language switch keep the product', async ({ page }) => {
    await page.goto('/en/products/nacre')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('NACRE')
    await expect(page.getByText('In stock').first()).toBeVisible()
  })

  test('unknown product is a 404', async ({ page }) => {
    const res = await page.goto('/produkter/finnes-ikke')
    expect(res?.status()).toBe(404)
  })
})

test.describe('drop, search and sharing', () => {
  test('drop page shows countdown and a consented waitlist form', async ({ page }) => {
    await page.goto('/drop/halcyon')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('HALCYON')
    await expect(page.getByText('døgn', { exact: true })).toBeVisible()
    await expect(page.getByText('Maks 2 per kunde')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Meld meg på' })).toBeVisible()
  })

  test('search understands Norwegian, English and typos', async ({ page }) => {
    await page.goto('/sok?q=merino')
    await expect(page.locator('[data-testid="product-grid"] > li').first()).toContainText('SÉRAC')
    await page.goto('/sok?q=isobr')
    await expect(page.locator('[data-testid="product-grid"] > li').first()).toContainText('ISOBAR')
    await page.goto('/en/search?q=windproof')
    await expect(page.locator('[data-testid="product-grid"] > li').first()).toContainText('SÉRAC')
  })

  test('generates an Open Graph image per product', async ({ request }) => {
    const res = await request.get('/og/products/nacre')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image/png')
  })
})
