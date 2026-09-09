import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5191'

test('restoring a completed session never renders signup and keeps the home background plain', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const user = { id: 'reload-test', email: 'test@example.com', name: 'Teste' }
    let release
    const pending = new Promise(resolve => { release = resolve })
    await page.addInitScript(() => {
      window.signupFlashed = false
      new MutationObserver(() => {
        if (document.querySelector('.ob-start-actions')) window.signupFlashed = true
      }).observe(document, { childList: true, subtree: true })
    })
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/get-session')) return route.fulfill({ json: { user, session: { id: 's', userId: user.id, expiresAt: new Date(Date.now()+3600000).toISOString() } } })
      if (path === '/api/onboarding') {
        await pending
        return route.fulfill({ json: { completed: true, organization: { id: 'org', name: 'Test', slug: 'test' }, project: { id: 'p', name: 'Test', organizationId: 'org' }, profile: { name: 'Teste' }, revision: 0, changelog: false, daily: false } })
      }
      return route.fulfill({ json: {} })
    })
    await page.goto(origin)
    await page.locator('.ob-brand').waitFor()
    assert.equal(await page.getByRole('status').filter({hasText:/A confirmar|A recuperar/}).count(),0)
    assert.equal(await page.locator('.ob-start-actions').count(), 0)
    release()
    await page.locator('.make-shell').waitFor()
    assert.equal(await page.evaluate(() => window.signupFlashed), false)
    assert.equal(await page.locator('.make-shell .make-purple-blob').count(), 0)
    assert.equal(await page.locator('.make-shell .make-background').evaluate(el => getComputedStyle(el).backgroundImage), 'none')
    await page.reload()
    await page.locator('.make-shell').waitFor()
    assert.equal(await page.evaluate(() => window.signupFlashed), false)
  } finally { await browser.close() }
})

test('an update replaces the old service worker without closing or reloading the open tab', async () => {
  let version = 1
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname
      if (path === '/' || path === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end('<html><body>Open form</body></html>') }
      let body = await readFile(new URL('../dist' + path, import.meta.url))
      if (path === '/sw.js') {
        body = body.toString()
        // Reproduce the previously deployed worker that waited for tabs to close.
        if (version === 1) body = body.replace('self.skipWaiting()', 'void 0').replace(/\w+\.clientsClaim\(\)/, 'void 0')
        body += '\n// version ' + version
      }
      res.setHeader('Content-Type', path.endsWith('.js') ? 'application/javascript' : path.endsWith('.html') ? 'text/html' : path.endsWith('.css') ? 'text/css' : 'application/octet-stream')
      res.setHeader('Cache-Control', 'no-store')
      res.end(body)
    } catch { res.writeHead(404); res.end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready })
    await page.reload()
    await page.waitForFunction(() => navigator.serviceWorker.controller)
    await page.evaluate(() => { window.formDraft = 'preserved'; window.oldWorker = navigator.serviceWorker.controller })
    version = 2
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update())
    await page.waitForFunction(() => navigator.serviceWorker.controller !== window.oldWorker)
    assert.equal(await page.evaluate(() => window.formDraft), 'preserved')
    assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting), null)
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
})
