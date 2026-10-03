import { expect, type APIRequestContext, type Page } from '@playwright/test'

/** Adds NACRE to the cart and fills checkout up to the simulated payment page. */
export async function checkoutToTestPayment(page: Page, email = 'e2e@example.com') {
  await page.goto('/produkter/nacre')
  await page.getByRole('button', { name: 'Legg i kurv' }).click()
  await expect(page.getByRole('link', { name: /Handlekurv, 1 varer/ })).toBeVisible()
  await page.getByRole('link', { name: /Gå til kurven/ }).click()

  await expect(page).toHaveURL(/\/handlekurv$/)
  await expect(page.getByText('NACRE').first()).toBeVisible()
  await page.getByRole('link', { name: 'Til kassen' }).click()

  await expect(page).toHaveURL(/\/kasse$/)
  await page.getByRole('textbox', { name: 'E-post', exact: true }).fill(email)
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

const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:54324'

/** Reads the newest one-time code sent to this address from the local mail catcher. */
export async function latestOtp(request: APIRequestContext, email: string): Promise<string> {
  let code = ''
  await expect
    .poll(
      async () => {
        const res = await request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
        )
        const { messages } = (await res.json()) as { messages: { Subject: string }[] }
        code = /(\d{6})/.exec(messages[0]?.Subject ?? '')?.[1] ?? ''
        return code
      },
      { timeout: 15_000 },
    )
    .toMatch(/^\d{6}$/)
  return code
}
