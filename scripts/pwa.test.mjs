import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Run against a production build: npm run build && npm run preview
const origin = process.env.PWA_TEST_URL || 'http://127.0.0.1:4173'
const browser = await chromium.launch()
try {
  const context = await browser.newContext()
  // Avoid real sessions, accounts, or news requests during this check.
  await context.route('https://**/*', route => route.fulfill({
    status: 200, contentType: 'application/json', body: 'null',
    headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' },
  }))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]')
    return (await fetch(link.href)).json()
  })
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.start_url, '/')
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'))
  for (const icon of manifest.icons) {
    const dimensions = await page.evaluate(async src => {
      const img = new Image(); img.src = src; await img.decode()
      return `${img.naturalWidth}x${img.naturalHeight}`
    }, icon.src)
    assert.equal(dimensions, icon.sizes)
  }
  const cdp = await context.newCDPSession(page)
  await cdp.send('Page.enable')
  assert.deepEqual((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors, [])
  await page.getByRole('button', { name: 'Continuar com email', exact: true }).waitFor()
  await context.setOffline(true)
  await page.getByRole('status').filter({ hasText: 'Sem ligação' }).waitFor()
  // Losing connectivity must keep the mounted app in place.
  await page.getByRole('button', { name: 'Continuar com email', exact: true }).waitFor()
  for (const path of ['/', '/eventos/pwa-offline-check']) {
    await page.goto(origin + path)
    await page.getByRole('heading', { name: 'Estás sem ligação à internet' }).waitFor()
  }
  const cachedUrls = await page.evaluate(async () => {
    const cachesByName = await Promise.all((await caches.keys()).map(name => caches.open(name)))
    return (await Promise.all(cachesByName.map(cache => cache.keys()))).flat().map(request => request.url)
  })
  assert.ok(cachedUrls.length > 0)
  assert.ok(cachedUrls.every(url => new URL(url).origin === origin))
  assert.ok(cachedUrls.every(url => !new URL(url).pathname.startsWith('/api/')))
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Continuar com email', exact: true }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Estás sem ligação à internet' }).count(), 0)
  assert.deepEqual(errors, [])
  console.log('Passed: installability, icon dimensions, worker control, offline root/deep links, mounted app preservation, reconnection, and static-only caches.')
} finally {
  await browser.close()
}
