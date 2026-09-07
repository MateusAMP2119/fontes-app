import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright'
let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser?.close() })

async function fixture({ org = true, username = 'reader', active = true, projectError = false } = {}) {
  const page = await browser.newPage()
  const session = { user: { id: 'test', email: 'test@example.test', name: 'Tester', emailVerified: true, username }, session: { id: 'session', activeOrganizationId: active && org ? 'org' : null, expiresAt: '2099-01-01' } }
  let organizations = org ? [{ id: 'org', name: 'Test', slug: 'test' }] : []
  let fail = projectError
  const posts = []
  await page.route('**/api/**', async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (req.method() === 'POST') posts.push({ path, body: req.postDataJSON() })
    if (path.endsWith('/get-session')) return route.fulfill({ json: session })
    if (path.endsWith('/organization/list')) return route.fulfill({ json: organizations })
    if (path.endsWith('/organization/set-active')) {
      session.session.activeOrganizationId = 'org'
      return route.fulfill({ json: organizations[0] })
    }
    if (path.endsWith('/organization-access/join')) {
      organizations = [{ id: 'org', name: 'Test', slug: 'test' }]
      return route.fulfill({ json: { organizationId: 'org' } })
    }
    if (path.endsWith('/update-user')) {
      session.user.username = req.postDataJSON().username
      return route.fulfill({ json: { status: true } })
    }
    if (path === '/api/projects') {
      if (req.method() === 'POST') return route.fulfill({ json: { id: 'p', ...req.postDataJSON() } })
      if (fail) return route.fulfill({ status: 503, json: { message:'unavailable' } })
      return route.fulfill({ json: [] })
    }
    return route.fulfill({ json: {} })
  })
  await page.goto('http://localhost:5173')
  return { page, posts, recover() { fail = false } }
}

test('project load failures show retry, never project creation', async () => {
  const f = await fixture({ projectError: true })
  try {
    await f.page.getByRole('alert').waitFor()
    assert.equal(await f.page.getByRole('heading', { name: 'Criar um projeto' }).count(), 0)
    f.recover()
    await f.page.getByRole('button', { name: 'Tentar novamente' }).click()
    await f.page.getByRole('heading', { name: 'Criar um projeto' }).waitFor()
  } finally { await f.page.close() }
})

test('project form submits selected visibility and blocks blank names', async () => {
  const { page, posts } = await fixture()
  try {
    await page.locator('#name').fill('   ')
    await page.getByRole('button', { name:'Criar projeto', exact:true }).click()
    await page.getByText('Introduz um nome.').waitFor()
    assert.equal(posts.length, 0)
    await page.locator('#name').fill('My project')
    await page.locator('input[value="public"]').check()
    await page.getByRole('button', { name:'Criar projeto', exact:true }).click()
    await page.waitForResponse((r) => r.url().endsWith('/api/projects') && r.request().method() === 'GET')
    assert.deepEqual(posts[0].body, { name: 'My project', visibility:'public' })
  } finally { await page.close() }
})

test('missing active organization is restored before creating a project', async () => {
  const { page, posts } = await fixture({ active:false })
  try {
    await page.getByRole('heading', { name: 'Criar um projeto' }).waitFor()
    assert.equal(posts[0].path, '/api/auth/organization/set-active')
  } finally { await page.close() }
})

test('username is saved and advances to project creation', async () => {
  const { page, posts } = await fixture({ username:null })
  try {
    await page.locator('#name').fill('valid_user')
    await page.getByRole('button', { name:'Continuar', exact:true }).click()
    await page.getByRole('heading', { name:'Criar um projeto' }).waitFor()
    assert.equal(posts[0].body.username, 'valid_user')
  } finally { await page.close() }
})

test('code editing preserves digit positions and joins the organization', async () => {
  const { page, posts } = await fixture({ org:false })
  try {
    await page.getByRole('button', { name:'Encontrar', exact:true }).click()
    await page.locator('#organization-name').fill('test')
    const digits = page.locator('.organization-code-digit')
    for (let i = 0; i < 4; i++) await digits.nth(i).fill(String(i+1))
    await digits.nth(1).fill('')
    assert.deepEqual(await digits.evaluateAll((inputs) => inputs.map((i) => i.value)), ['1','','3','4'])
    await page.getByRole('button', { name:'Entrar na organização' }).click()
    await page.getByText('Introduz os quatro dígitos do código.').waitFor()
    assert.equal(posts.length, 0)
    await digits.nth(1).fill('2')
    await page.getByRole('button', { name:'Entrar na organização' }).click()
    await page.getByRole('heading', { name:'Criar um projeto' }).waitFor()
    assert.deepEqual(posts.find((p) => p.path.endsWith('/join')).body, { name:'test', code:'1234' })
  } finally { await page.close() }
})
