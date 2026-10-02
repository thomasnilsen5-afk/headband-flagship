import { expect, test, type Page } from '@playwright/test'

/**
 * The full purchase flow against a real database (local Supabase in CI) with the simulated
 * payment provider. Each test runs in its own browser context, so each gets its own cart.
 */
async function fillCheckout(page: Page) {
  await page.goto('/produkter/nacre')
  await page.getByRole('button', { name: 'Legg i kurv' }).click()
  await expect(page.getByRole('link', { name: /Handlekurv, 1 varer/ })).toBeVisible()
  await page.getByRole('link', { name: /Gå til kurven/ }).click()

  await expect(page).toHaveURL(/\/handlekurv$/)
  await expect(page.getByText('NACRE').first()).toBeVisible()
  await page.getByRole('link', { name: 'Til kassen' }).click()

  await expect(page).toHaveURL(/\/kasse$/)
  await page.getByRole('textbox', { name: 'E-post', exact: true }).fill('e2e@example.com')
  await page.getByRole('textbox', { name: /^Mobil/ }).fill('41234567')
  await page.getByRole('textbox', { name: 'Fullt navn', exact: true }).fill('Test Testesen')
  await page.getByRole('textbox', { name: 'Adresse', exact: true }).fill('Testveien 1')
  await page.getByRole('textbox', { name: 'Postnummer', exact: true }).fill('0150')
  await page.getByRole('textbox', { name: 'Sted', exact: true }).fill('Oslo')
  await page.getByRole('radio', { name: /Testbetaling/ }).check()
  await page.getByRole('checkbox', { name: /Jeg godtar/ }).check()
  await page.getByRole('button', { name: /^Betal / }).click()
  await expect(page).toHaveURL(/\/kasse\/testbetaling\?/)
}

test.describe('checkout', () => {
  test('buys a product end to end', async ({ page }) => {
    const cspErrors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error' && /Content Security Policy/i.test(m.text()))
        cspErrors.push(m.text())
    })

    await fillCheckout(page)
    await page.getByRole('button', { name: 'Simuler godkjent betaling' }).click()

    await expect(page).toHaveURL(/\/kasse\/bekreftelse\?/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Takk.')
    await expect(
      page.getByRole('status').filter({ hasText: 'Betalingen er godkjent' }),
    ).toBeVisible()
    await expect(page.getByText(/Ordre \d+/)).toBeVisible()
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
