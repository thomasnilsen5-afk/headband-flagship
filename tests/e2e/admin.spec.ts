import { expect, test, type APIRequestContext } from '@playwright/test'
import { checkoutToTestPayment, expectEmail, ownClientIp, signIn } from './helpers'

const api = process.env.NEXT_PUBLIC_SUPABASE_URL!
const secret = process.env.SUPABASE_SECRET_KEY!
const unique = (tag: string, project: string) => `e2e-${tag}-${project}-${Date.now()}@example.com`

/** Promotes a signed-up user to admin with the service key (what an owner does once). */
async function makeAdmin(request: APIRequestContext, email: string) {
  const headers = { apikey: secret, Authorization: `Bearer ${secret}` }
  const res = await request.get(`${api}/auth/v1/admin/users?per_page=1000`, { headers })
  const { users } = (await res.json()) as { users: { id: string; email: string }[] }
  const id = users.find((u) => u.email === email)?.id
  expect(id).toBeTruthy()
  const patch = await request.patch(`${api}/rest/v1/profiles?id=eq.${id}`, {
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    data: { role: 'admin' },
  })
  expect(patch.ok()).toBeTruthy()
}

test.describe('admin', () => {
  test('customers get a 404', async ({ page, request }, info) => {
    await ownClientIp(page)
    await signIn(page, request, unique('cust', info.project.name))
    const res = await page.goto('/admin')
    expect(res?.status()).toBe(404)
  })

  test('staff ship an order and settle a return end to end', async ({
    page,
    browser,
    request,
  }, info) => {
    test.slow()
    const customer = unique('buyer', info.project.name)
    await checkoutToTestPayment(page, customer)
    await page.getByRole('button', { name: 'Simuler godkjent betaling' }).click()
    const number = (await page.getByText(/Ordre \d+/).textContent())?.match(/\d+/)?.[0]

    // Staff in a separate browser.
    const staffContext = await browser.newContext()
    const staff = await staffContext.newPage()
    await ownClientIp(staff)
    const staffEmail = unique('staff', info.project.name)
    await signIn(staff, request, staffEmail)
    await makeAdmin(request, staffEmail)

    await staff.goto('/admin/ordre?status=paid')
    await staff.getByRole('link', { name: number!, exact: true }).click()
    await expect(staff.getByRole('heading', { level: 1 })).toHaveText(`Ordre ${number}`)
    await staff.getByLabel('Sporingsnummer').fill('70712345678')
    await staff.getByRole('button', { name: 'Trekk beløp og merk som sendt' }).click()
    // The ship form gives way to the tracking link once the order is shipped.
    await expect(staff.getByRole('link', { name: 'Posten 70712345678' })).toBeVisible()
    await expect(staff.getByText(/test · captured/)).toBeVisible()
    await expectEmail(request, customer, new RegExp(`^Ordre ${number} er sendt$`))
    await staff.getByRole('button', { name: 'Merk som levert' }).click()
    await expect(staff.getByText(/Levert: \d/)).toBeVisible()

    // Customer asks to return the item.
    await signIn(page, request, customer)
    await page.getByRole('link', { name: new RegExp(`Ordre ${number}`) }).click()
    await page.getByRole('combobox', { name: /Antall å returnere/ }).selectOption('1')
    await page.getByRole('button', { name: 'Be om retur' }).click()
    await expect(page.getByText('Returen er registrert')).toBeVisible()

    // Staff walk it through approve → received (restocks) → refunded.
    const row = () => staff.getByRole('listitem').filter({ hasText: `Ordre ${number}` })
    await staff.goto('/admin/retur')
    await row().getByRole('button', { name: 'Godkjenn' }).click()
    await expect(row().getByText('Godkjent', { exact: true })).toBeVisible()
    await row().getByRole('button', { name: 'Mottatt (legg på lager)' }).click()
    await expect(row().getByText('Mottatt', { exact: true })).toBeVisible()
    // Whole order returned: items 690 kr + original shipping 49 kr (angrerettloven § 23).
    await expect(row().getByLabel('Beløp (kr)')).toHaveValue('739.00')
    await row().getByRole('button', { name: 'Refunder' }).click()
    await expect(row().getByText('Refundert: 739 kr')).toBeVisible()
    await expectEmail(request, customer, /^Retur for ordre \d+$/)

    await staff.goto(`/admin/ordre`)
    await staff.getByRole('link', { name: number!, exact: true }).click()
    await expect(staff.getByText(/test · refunded · .* · refundert 739 kr/)).toBeVisible()
    await staffContext.close()
  })

  test('staff adjust stock with a reason', async ({ page, request }, info) => {
    await ownClientIp(page)
    const email = unique('stock', info.project.name)
    await signIn(page, request, email)
    await makeAdmin(request, email)
    await page.goto('/admin/lager')
    const row = page.getByRole('row').filter({ hasText: 'MRD-NAC-ONE' })
    const before = Number(await row.getByRole('cell').nth(2).textContent())
    await row.getByLabel('Antall for MRD-NAC-ONE').fill('5')
    await row.getByRole('button', { name: 'Lagre' }).click()
    await expect(row.getByText('Lagret.')).toBeVisible()
    await page.reload()
    await expect(row.getByRole('cell').nth(2)).toHaveText(String(before + 5))
  })
})
