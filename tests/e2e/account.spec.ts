import { expect, test } from '@playwright/test'
import { checkoutToTestPayment, latestOtp } from './helpers'

test.describe('account', () => {
  test('signed-out visitors are sent to sign-in', async ({ page }) => {
    await page.goto('/konto')
    await expect(page).toHaveURL(/\/konto\/logg-inn$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Logg inn')
  })

  test('a guest order appears in the account after signing in with a code', async ({
    page,
    request,
  }, info) => {
    // Unique per project and run, so parallel projects never share an inbox or account.
    const email = `e2e-${info.project.name}-${Date.now()}@example.com`
    await checkoutToTestPayment(page, email)
    await page.getByRole('button', { name: 'Simuler godkjent betaling' }).click()
    const number = (await page.getByText(/Ordre \d+/).textContent())?.match(/\d+/)?.[0]

    await page.goto('/konto/logg-inn')
    await page.getByRole('textbox', { name: 'E-post' }).fill(email)
    await page.getByRole('button', { name: 'Send kode' }).click()
    await expect(page.getByText(`Vi har sendt en kode til ${email}`)).toBeVisible()

    await page.getByRole('textbox', { name: 'Engangskode' }).fill('000000')
    await page.getByRole('button', { name: 'Logg inn' }).click()
    await expect(page.locator('#signin-msg')).toHaveText(/Sjekk e-posten eller koden/)

    await page.getByRole('textbox', { name: 'Engangskode' }).fill(await latestOtp(request, email))
    await page.getByRole('button', { name: 'Logg inn' }).click()

    await expect(page).toHaveURL(/\/konto$/)
    const row = page.getByRole('link', { name: new RegExp(`Ordre ${number}`) })
    await expect(row).toContainText('Betalt')
    await row.click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Ordre ${number}`)
    await expect(page.getByText('NACRE').first()).toBeVisible()

    await page.goto('/konto')
    await page.getByRole('button', { name: 'Logg ut' }).click()
    await expect(page).toHaveURL(/:\d+\/$/)
    await page.goto('/konto')
    await expect(page).toHaveURL(/\/konto\/logg-inn$/)
  })
})
