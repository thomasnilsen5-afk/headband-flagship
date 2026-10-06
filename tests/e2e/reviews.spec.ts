import { expect, test } from '@playwright/test'
import { checkoutToTestPayment, makeAdmin, ownClientIp, signIn } from './helpers'

const unique = (tag: string, project: string) => `e2e-${tag}-${project}-${Date.now()}@example.com`
// 2×2 PNG: enough for the browser to decode and downscale, and for the server to re-encode.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWOwe3bQ7tlBBggFADMOB5X6B7AHAAAAAElFTkSuQmCC',
  'base64',
)

test('a verified buyer reviews with a photo; staff publish it to the product page', async ({
  page,
  browser,
  request,
}, info) => {
  test.slow()
  const buyer = unique('rev', info.project.name)
  await checkoutToTestPayment(page, buyer)
  await page.getByRole('button', { name: 'Simuler godkjent betaling' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Takk.')

  await signIn(page, request, buyer)
  await page.goto('/konto/anmeld/nacre')
  const five = page.getByRole('radio', { name: /5 stjerner/ })
  await page.locator('label').filter({ has: five }).click()
  await expect(five).toBeChecked()
  const body = `Sitter som støpt på løpeturen. ${info.project.name} ${Date.now()}`
  await page.getByRole('textbox', { name: 'Hva synes du?' }).fill(body)
  await page.getByRole('textbox', { name: 'Navn som vises' }).fill('Ola')
  await page
    .getByLabel('Bilder (valgfritt, opptil 3)')
    .setInputFiles({ name: 'run.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('button', { name: 'Send inn' }).click()
  await expect(
    page.getByText('Takk! Anmeldelsen publiseres når vi har sett over den.'),
  ).toBeVisible()

  // Pending reviews are not public.
  await page.goto('/produkter/nacre')
  await expect(page.getByText(body)).toHaveCount(0)

  const staffContext = await browser.newContext()
  const staff = await staffContext.newPage()
  await ownClientIp(staff)
  const staffEmail = unique('mod', info.project.name)
  await signIn(staff, request, staffEmail)
  await makeAdmin(request, staffEmail)
  await staff.goto('/admin/anmeldelser')
  const card = staff.getByRole('listitem').filter({ hasText: body })
  await expect(card.getByText('Verifisert kjøp')).toBeVisible()
  // Staff can see the pending photo (the media route lets staff read unpublished files).
  const pending = card.getByRole('img', { name: 'Kundebilde' })
  await expect
    .poll(() => pending.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth))
    .toBeGreaterThan(0)
  await card.getByRole('button', { name: 'Publiser' }).click()
  await expect(staff.getByText(body)).toHaveCount(0)
  await staffContext.close()

  await page.goto('/produkter/nacre')
  const review = page.getByRole('listitem').filter({ hasText: body })
  await expect(review).toBeVisible()
  await expect(review.getByText('Verifisert kjøp')).toBeVisible()
  const photo = review.getByRole('img', { name: /Kundebilde 1 av Ola/ })
  const src = await photo.getAttribute('src')
  const res = await request.get(src!)
  expect(res.headers()['content-type']).toBe('image/webp')
  expect(res.headers()['cache-control']).toContain('public')
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent()
  expect(JSON.parse(ld!).aggregateRating.reviewCount).toBeGreaterThan(0)
})
