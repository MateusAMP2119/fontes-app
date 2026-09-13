// Browser integration test: run with the local Vite server on port 5173.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
const hash = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url))).browserHash
const browser = await chromium.launch({ headless: true })
const output = new URL('../artifacts/rankings/', import.meta.url)
mkdirSync(output, { recursive: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const names = ['Agência Lusa', 'Ana Costa', 'João Silva', 'Maria Santos', 'Pedro Ferreira', 'Sofia Martins']
  const rows = names.map((name, i) => {
    const count = [120, 100, 60, 20, 10, 5][i], previous_count = i === 5 ? 0 : 20
    const activity = Array.from({ length: 24 }, (_, bucket) => bucket === 20 ? Math.ceil(count / 2) : bucket === 15 ? Math.floor(count / 2) : 0)
    if (i === 0) { activity[23] = activity[20]; activity[20] = 0 }
    if (i === 1) { activity[0] = activity[15]; activity[15] = 0 }
    return { id: i + 1, name, count, previous_count, growth_percent: previous_count ? (count - previous_count) * 100 / previous_count : null, activity }
  })
  const lists = { writers: rows, categories: rows.map((r, i) => ({ ...r, name: ['Política', 'Economia', 'Sociedade', 'Mundo', 'Cultura', 'Desporto'][i] })), mentions: rows.map((r, i) => ({ ...r, kind: ['person', 'org', 'location'][i % 3], name: ['Luís Montenegro', 'Governo', 'Lisboa', 'António José Seguro', 'Comissão Europeia', 'Portugal'][i] })) }
  let status = 200, data = lists, requests = 0
  const requestedDays = []
  let releaseThirty
  let holdThirty = true
  const thirtyGate = new Promise(resolve => { releaseThirty = resolve })
  await page.route('**/src/main.tsx*', route => route.fulfill({ contentType: 'text/javascript', body: `
    import React from '/node_modules/.vite/deps/react.js?v=${hash}';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js?v=${hash}';
    import Dashboard from '/src/Dashboard.tsx';
    import '/src/index.css'; import '/src/shadcn.css';
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Dashboard, {path:'/',project:null,session:{user:{id:'rankings-test',emailVerified:true},session:{token:'test-session'}}}));
  ` }))
  await page.route('https://fontes-api.bymarreco.com/**', route => route.fulfill({ json: [] }))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/rankings') {
      requests++
      assert.equal(route.request().headers().authorization, 'Bearer test-session')
      assert.equal(url.searchParams.get('sort'), 'volume')
      const requestDays = (Date.parse(url.searchParams.get('until')) - Date.parse(url.searchParams.get('from'))) / 86400000
      assert.ok([1, 7, 30].includes(requestDays))
      requestedDays.push(requestDays)
      if (requestDays === 30 && holdThirty) await thirtyGate
      return route.fulfill({ status, json: data })
    }
    if (url.pathname === '/api/briefing') return route.fulfill({ json: { briefing: { text: 'A atualidade nacional é marcada pelo debate sobre a habitação e pelas novas medidas económicas. Na Europa, as negociações prosseguem entre os Estados-membros.', generated_at: Math.floor(Date.now()/1000), period: {from:1,until:2} } } })
    return route.fulfill({ json: {} })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install()
  const backgroundThirty = page.waitForRequest(request => {
    const url = new URL(request.url())
    return url.pathname === '/api/rankings' && Date.parse(url.searchParams.get('until')) - Date.parse(url.searchParams.get('from')) === 30 * 86400000
  })
  await page.goto('http://127.0.0.1:5173/')
  await page.locator('.home-ranking-row').first().waitFor()
  assert.equal(await page.locator('.home-ranking-row').count(), 15)
  assert.equal(await page.locator('.home-ranking-trend svg').count(), 15)
  assert.equal(await page.locator('.home-ranking-unit').count(), 0)
  assert.equal(await page.locator('.home-ranking-count').first().textContent(), '120')
  await backgroundThirty
  await page.waitForFunction(() => Object.keys(localStorage).some(key => key.startsWith('fontes:rankings:') && key.endsWith(':1')))
  assert.equal(requestedDays[0], 7, 'selected period starts first')
  assert.deepEqual([...requestedDays].sort((a, b) => a - b), [1, 7, 30], 'other periods start without clicks')
  await page.getByRole('button', { name: '30 dias', exact: true }).click()
  assert.equal(await page.locator('.home-ranking-placeholder').count(), 15)
  assert.equal(requests, 3, 'selecting an in-flight period shares the request')
  holdThirty = false
  releaseThirty()
  await page.locator('.home-ranking-row').first().waitFor()
  assert.equal(requests, 3, 'selection did not start a duplicate fetch')
  for (const period of [{ days: 1, label: '24 h' }, { days: 30, label: '30 dias' }, { days: 7, label: '7 dias' }]) {
    await page.getByRole('button', { name: period.label, exact: true }).click()
    await page.locator('.home-ranking-row').first().waitFor()
    assert.equal(await page.getByRole('button', { name: period.label, exact: true }).getAttribute('aria-pressed'), 'true')
  }
  assert.equal(requests, 3, 'returning to a fresh period uses its cached results')
  await page.reload()
  await page.locator('.home-ranking-row').first().waitFor()
  assert.equal(requests, 3, 'fresh results survive reload without another request')
  assert.equal(await page.locator('#ranking-list-writers .home-ranking-trend').nth(0).evaluate(el => getComputedStyle(el).color), 'rgb(22, 163, 74)')
  assert.equal(await page.locator('#ranking-list-writers .home-ranking-trend').nth(1).evaluate(el => getComputedStyle(el).color), 'rgb(220, 38, 38)')
  assert.ok(await page.locator('#ranking-list-writers .home-ranking-trend').nth(2).evaluate(el => el.classList.contains('is-flat')))
  const briefing = await page.locator('.home-briefing').boundingBox()
  const ranks = await page.locator('.home-rankings').boundingBox()
  assert.ok(ranks.y > briefing.y + briefing.height)
  assert.ok(Math.abs(ranks.x - briefing.x) < 1)
  assert.ok(Math.abs(ranks.width - briefing.width) < 1)
  const cols = await page.locator('.home-ranking-column').evaluateAll(nodes => nodes.map(n => {const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width}}))
  assert.equal(cols[0].y, cols[2].y)
  assert.ok(Math.abs(cols[0].width - cols[2].width) < 1)
  await page.screenshot({ path: fileURLToPath(new URL('desktop-light.png', output)), fullPage: true })
  await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click()
  await page.screenshot({ path: fileURLToPath(new URL('desktop-dark.png', output)), fullPage: true })
  await page.getByRole('button', { name: 'Mostrar mais: Autores', exact: true }).click()
  assert.equal(await page.locator('#ranking-list-writers li').count(), 6)
  assert.equal(await page.locator('#ranking-list-writers .home-ranking-count').last().textContent(), '5')
  await page.getByRole('button', { name: 'Mostrar menos: Autores', exact: true }).click()
  assert.equal(await page.locator('#ranking-list-writers li').count(), 5)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: fileURLToPath(new URL('mobile.png', output)), fullPage: true })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const mobileBriefing = await page.locator('.home-briefing').boundingBox()
  const mobileRankings = await page.locator('.home-rankings').boundingBox()
  assert.ok(Math.abs(mobileBriefing.x - mobileRankings.x) < 1)
  assert.ok(Math.abs(mobileBriefing.width - mobileRankings.width) < 1)
  const mobile = await page.locator('.home-ranking-column').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().y))
  assert.ok(mobile[0] < mobile[1] && mobile[1] < mobile[2])
  status = 503
  const refreshed = page.waitForResponse(response => response.url().includes('/api/rankings'))
  await page.clock.runFor(300100)
  await refreshed
  assert.equal(requests, 4, 'expired results refresh automatically')
  assert.equal(await page.locator('.home-ranking-row').count(), 15, 'cached results stay visible on refresh failure')
  await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('fontes:rankings:')).forEach(key => localStorage.removeItem(key)))
  await page.reload()
  await page.clock.runFor(100)
  assert.equal(await page.locator('.home-ranking-placeholder').count(), 15)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  assert.equal(await page.locator('.home-ranking-placeholder span').first().evaluate(el => getComputedStyle(el).animationName), 'ranking-shimmer')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.locator('.home-ranking-placeholder span').first().evaluate(el => getComputedStyle(el).animationName), 'none')
  assert.equal(await page.locator('.home-rankings [role=alert]').count(), 0)
  assert.equal(await page.locator('.home-rankings').getByRole('button', { name: 'Tentar novamente' }).count(), 0)
  status = 200; data = { writers: [], categories: [], mentions: [] }
  await page.clock.runFor(30100)
  await page.getByText('Sem resultados neste período.').first().waitFor()
  assert.equal(await page.getByText('Sem resultados neste período.').count(), 3)
  assert.deepEqual(errors, [])
  console.log('Rankings browser checks passed: authenticated fetch, period, desktop/mobile, expansion, failure and retry, empty state. Requests:', requests)
} finally { await browser.close() }
