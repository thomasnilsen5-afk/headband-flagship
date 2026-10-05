import { expect, test } from '@playwright/test'
import { expectEmail, checkoutToTestPayment as fillCheckout } from './helpers'

/**
 * The full purchase flow against a real database (local Supabase in CI) with the simulated
 * payment provider. Each test runs in its own browser context, so each gets its own cart.
 */
test.describe('checkout', () => {
  test('buys a product end to end', async ({ page, request }, info) => {
    const email = `e2e-buy-${info.project.name}-${Date.now()}@example.com`
    const cspErrors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error' && /Content Security Policy/i.test(m.text()))
        cspErrors.push(m.text())
    })

    await fillCheckout(page, email)
    await page.getByRole('button', { name: 'Simuler godkjent betaling' }).click()

    await expect(page).toHaveURL(/\/kasse\/bekreftelse\?/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Takk.')
    await expect(
      page.getByRole('status').filter({ hasText: 'Betalingen er godkjent' }),
    ).toBeVisible()
    await expect(page.getByText(/Ordre \d+/)).toBeVisible()
    const number = (await page.getByText(/Ordre \d+/).textContent())?.match(/\d+/)?.[0]
    // Exactly one confirmation, even though the confirmation page also reconciles the payment.
    expect(await expectEmail(request, email, new RegExp(`^Ordre ${number} er bekreftet$`))).toBe(1)
    // The cart was converted with the payment: the header count resets and the cart is empty.
    await expect(page.getByRole('link', { name: /Handlekurv, 0 varer/ })).toBeVisible()
    await page.goto('/handlekurv')
    await expect(page.getByText('Kurven er tom.')).toBeVisible()
    expect(cspErrors).toEqual([])
  })

  test('cancelling payment keeps the cart', async ({ page }) => {
    await fillCheckout(page)
    await page.getByRole('button', { name: 'Avbryt betalingen' }).click()
    await expect(page).toHaveURL(/\/kasse\?avbrutt=/)
    await expect(page.getByText('Betalingen ble avbrutt')).toBeVisible()
    await expect(page.getByText('NACRE').first()).toBeVisible()
  })

  test('confirmation page refuses a forged token', async ({ page }) => {
    const res = await page.goto(
      '/kasse/bekreftelse?ordre=00000000-0000-4000-8000-000000000000&t=forged',
    )
    expect(res?.status()).toBe(404)
  })
})
