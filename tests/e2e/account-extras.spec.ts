import { expect, test } from '@playwright/test'
import { checkoutToTestPayment, expectEmail, signIn } from './helpers'

const unique = (tag: string, project: string) => `e2e-${tag}-${project}-${Date.now()}@example.com`

test.describe('account extras', () => {
  test('saved address prefills checkout, and the wishlist keeps products', async ({
    page,
    request,
  }, info) => {
    await signIn(page, request, unique('addr', info.project.name))

    await page.getByRole('link', { name: 'Adresser' }).click()
    await expect(page).toHaveURL(/\/konto\/adresser$/)
    await page.getByRole('textbox', { name: 'Fullt navn' }).fill('Kari Konto')
    await page.getByRole('textbox', { name: 'Adresse', exact: true }).fill('Kontoveien 7')
    await page.getByRole('textbox', { name: 'Postnummer' }).fill('5003')
    await page.getByRole('textbox', { name: 'Sted' }).fill('Bergen')
    await page.getByRole('checkbox', { name: 'Bruk som standard i kassen' }).check()
    await page.getByRole('button', { name: 'Lagre adresse' }).click()
    await expect(page.getByText('Kontoveien 7, 5003 Bergen')).toBeVisible()
    await expect(page.getByText('Standard', { exact: true })).toBeVisible()

    await page.goto('/produkter/nacre')
    await page.getByRole('button', { name: 'Lagre', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Lagret' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.goto('/konto/onskeliste')
    await expect(page.getByRole('link', { name: /NACRE/ })).toBeVisible()
    await page.getByRole('button', { name: 'Fjern' }).click()
    await expect(page.getByText('Ingenting lagret ennå')).toBeVisible()

    await page.goto('/produkter/nacre')
    await page.getByRole('button', { name: 'Legg i kurv' }).click()
    await expect(page.getByRole('link', { name: /Handlekurv, 1 varer/ })).toBeVisible()
    await page.goto('/kasse')
    await expect(page.getByRole('textbox', { name: 'Fullt navn', exact: true })).toHaveValue(
      'Kari Konto',
    )
    await expect(page.getByRole('textbox', { name: 'Postnummer', exact: true })).toHaveValue('5003')
  })

  test('a customer can request a return once per unit', async ({ page, request }, info) => {
    const email = unique('ret', info.project.name)
    await checkoutToTestPayment(page, email)
    await page.getByRole('button', { name: 'Simuler godkjent betaling' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Takk.')

    await signIn(page, request, email)
    await page.getByRole('link', { name: /Ordre \d+/ }).click()
    await page.getByRole('combobox', { name: /Antall å returnere/ }).selectOption('1')
    await page.getByRole('textbox', { name: 'Grunn (valgfritt)' }).fill('Feil størrelse')
    await page.getByRole('button', { name: 'Be om retur' }).click()
    await expect(page.getByText('Returen er registrert')).toBeVisible()
    await expectEmail(request, email, /^Retur for ordre \d+$/)

    await page.reload()
    await expect(page.getByText('Forespurt')).toBeVisible()
    // The only unit is already requested, so the form is gone.
    await expect(page.getByRole('button', { name: 'Be om retur' })).toHaveCount(0)
  })
})
