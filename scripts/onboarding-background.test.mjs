import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chromium } from 'playwright'
const origin = process.env.TEST_ORIGIN || 'http://localhost:5173'

test('workspace confirmation, automatic URL collision, confirmed completion and offline recovery', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const user = { id: 'background-test', email: 'test@example.com', name: 'Teste', emailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    let state = { organization: null, project: null, profile: { name: 'Teste' }, revision: 0, completed: false, changelog: false, daily: false }
    let blocked = true, collide = true, completionOffline = true
    const writes = [], errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/get-session')) return route.fulfill({ json: { user, session: { id: 's', token: 'test', userId: user.id, expiresAt: new Date(Date.now()+3600000).toISOString() } } })
      if (path === '/api/onboarding') {
        if (route.request().method() === 'GET') return route.fulfill({ json: state })
        const body = route.request().postDataJSON(); writes.push(body)
        if (collide) { collide = false; return route.fulfill({ status: 409, json: { message: 'Este URL já está em uso. É necessário outro URL.', step: 'workspace' } }) }
        if (blocked || (body.completed && completionOffline)) return route.fulfill({ status: 503, json: { message: 'offline' } })
        state = { ...state, organization: { id:'org', name:body.name, slug:body.slug }, project: { id:'project', organizationId:'org', name:'O meu projeto', createdAt:user.createdAt }, profile: { name:body.profileName }, revision:body.revision, completed:body.completed }
        return route.fulfill({ json: state })
      }
      return route.fulfill({ json: {} })
    })
    await page.goto(origin)
    await page.getByRole('textbox', { name:'Nome', exact:true }).fill('Equipa')
    await page.getByRole('button', { name:'Criar ambiente', exact:true }).click()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('fontes:onboarding:v1:background-test')).draft.slug !== 'equipa')
    await page.locator('.ob-profile').waitFor()
    assert.equal(await page.locator('.ob-workspace').count(), 0)
    assert.equal(await page.locator('.ob-profile').count(), 1, 'profile drafting does not wait for workspace creation')
    assert.equal(await page.getByRole('button', { name:'Continuar', exact:true }).isDisabled(), false, 'profile entry can continue while workspace confirmation is pending')
    blocked = false
    await page.evaluate(() => dispatchEvent(new Event('online')))
    await page.getByRole('textbox', { name:'Nome do perfil' }).fill('Nome final')
    assert.ok(writes.some(body => body.name === 'Equipa' && /^equipa-/.test(body.slug)), 'same display name gets a different generated URL')
    await page.getByRole('button', { name:'Continuar', exact:true }).click()
    await page.getByRole('button', { name:'Saltar', exact:true }).click()
    await page.getByRole('button', { name:'Começar', exact:true }).click()
    await page.getByRole('alert').waitFor()
    assert.equal(await page.locator('.make-shell').count(), 0)
    assert.equal(state.completed, false, 'app waits for server confirmation')
    const local = await page.evaluate(() => JSON.parse(localStorage.getItem('fontes:onboarding:v1:background-test')))
    assert.equal(local.finished, undefined)
    assert.equal(local.pending.completed, true)
    assert.equal(local.pending.profileName, 'Nome final')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('fontes:onboarding:v1:background-test')).pending?.revision > 0)
    assert.ok(writes.some(body => body.completed), 'final save runs after the app opens')
    await page.reload()
    await page.locator('.ob-updates').waitFor()
    assert.equal(await page.locator('.make-shell').count(), 0, 'reload preserves pending completion')
    completionOffline = false
    await page.evaluate(() => dispatchEvent(new Event('online')))
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('fontes:onboarding:v1:background-test')).pending)
    await page.locator('.make-shell').waitFor()
    assert.equal(state.completed, true)
    assert.equal(state.profile.name, 'Nome final')
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})

test('an explicitly chosen URL stays editable after a conflict', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const user = { id: 'manual-url-test', email: 'manual@example.com', name: 'Teste', emailVerified: true }
    const writes = []
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/get-session')) return route.fulfill({ json: { user, session: { id:'s', userId:user.id, expiresAt:new Date(Date.now()+3600000).toISOString() } } })
      if (path === '/api/onboarding' && route.request().method() === 'POST') {
        writes.push(route.request().postDataJSON())
        return route.fulfill({ status:409, json:{ message:'Este URL já está em uso. É necessário outro URL.', step:'workspace' } })
      }
      return route.fulfill({ json:{ organization:null, project:null, profile:{ name:'Teste' }, revision:0, completed:false } })
    })
    await page.goto(origin)
    await page.getByRole('textbox', { name:'Nome', exact:true }).fill('Equipa')
    await page.getByRole('textbox', { name:'URL do ambiente' }).fill('url-escolhido')
    await page.getByRole('button', { name:'Criar ambiente', exact:true }).click()
    await page.getByRole('alert').filter({ hasText:'Este URL já está em uso' }).waitFor()
    assert.equal(await page.getByRole('textbox', { name:'URL do ambiente' }).inputValue(), 'url-escolhido')
    assert.equal(await page.getByRole('textbox', { name:'URL do ambiente' }).isEnabled(), true)
    assert.equal(writes.length, 1)
    assert.equal(await page.locator('.ob-profile').count(), 1)
    await page.getByRole('form', { name:'Correção da configuração' }).waitFor()
  } finally { await browser.close() }
})
