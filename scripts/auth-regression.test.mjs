import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright'

const origin = 'http://localhost:5173'
const password = 'Autofill-Test-123!'
let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser?.close() })

async function form(path = '/') {
  const page = await browser.newPage()
  const requests = []
  // Never send credentials, create accounts or send email during these tests.
  await page.route('**/api/auth/**', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') requests.push(request.postDataJSON())
    await route.fulfill({ json: request.url().includes('get-session') ? null : { user: { id: 'test' }, token: null } })
  })
  await page.goto(origin + path)
  await page.locator('#password').waitFor()
  return { page, requests }
}

// Model a password manager that updates the DOM without a React change event.
async function autofill(page, id, value = password) {
  await page.locator(`#${id}`).evaluate((input, value) => { input.value = value }, value)
}

test('signup preserves silent autofill across reveal and session refetch', async () => {
  const { page, requests } = await form()
  try {
    await page.locator('#email').fill('autofill@example.test')
    await autofill(page, 'password')
    await autofill(page, 'password-confirmation')
    await page.getByRole('button', { name: 'Mostrar palavra-passe', exact: true }).click()
    assert.equal(await page.locator('#password').inputValue(), password)
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await page.getByText('Verifica o teu email para confirmares a conta.').waitFor()
    assert.equal(requests[0].password, password)
    assert.equal(await page.locator('#password').inputValue(), password)
  } finally { await page.close() }
})

test('login submits the filled field, even when React has an older value', async () => {
  const { page, requests } = await form('/login')
  try {
    await page.locator('#email').fill('autofill@example.test')
    await page.locator('#password').fill('Previously-Typed-123!')
    await autofill(page, 'password')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForFunction(() => location.pathname === '/')
    assert.equal(requests[0].password, password)
  } finally { await page.close() }
})

test('signup rejects mismatched autofilled confirmation', async () => {
  const { page, requests } = await form()
  try {
    await page.locator('#email').fill('autofill@example.test')
    await autofill(page, 'password')
    await autofill(page, 'password-confirmation', 'Different-Password-123!')
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await page.getByText('As palavras-passe não coincidem.').waitFor()
    assert.equal(requests.length, 0)
  } finally { await page.close() }
})

test('reset submits autofilled password and leaves login enabled', async () => {
  const { page, requests } = await form('/login?mode=reset&token=test-only')
  try {
    await autofill(page, 'password')
    await autofill(page, 'password-confirmation')
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await page.getByText('Palavra-passe atualizada. Já podes entrar.').waitFor()
    assert.equal(requests[0].newPassword, password)
    assert.equal(await page.getByRole('button', { name: 'Entrar', exact: true }).isEnabled(), true)
  } finally { await page.close() }
})

test('password reveal button sits at the right edge inside the input', async () => {
  const { page } = await form()
  try {
    const input = await page.locator('#password').boundingBox()
    const toggle = await page.getByRole('button', { name: 'Mostrar palavra-passe', exact: true }).boundingBox()
    assert.ok(toggle.x >= input.x)
    assert.ok(Math.abs(input.x + input.width - toggle.x - toggle.width - 4) < 1)
    assert.ok(toggle.y >= input.y)
    assert.ok(toggle.y + toggle.height <= input.y + input.height)
  } finally { await page.close() }
})
