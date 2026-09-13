// Run against the local Vite server: node tests/briefing.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const hash = JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url))).browserHash
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  let rating = null
  let feedbackFails = false
  const now = Math.floor(Date.now() / 1000)
  const briefing = { generation_id: 'saved-1', text: 'Resumo das notícias.', generated_at: now, period: { from: now - 86400, until: now }, segments: [{ text: 'Notícias sobre ' }, { text: 'habitação', story_id: 42 }, { text: '.' }], notes: [] }
  let reads = 0
  let heldRead = null
  let status = 200
  let generated = 0
  // Mount the real home with a synthetic session, without requiring account credentials.
  await page.route('**/src/main.tsx*', route => route.fulfill({ contentType: 'text/javascript', body: `
    import React from '/node_modules/.vite/deps/react.js?v=${hash}';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js?v=${hash}';
    import MakeApp from '/src/MakeApp.tsx';
    import '/src/index.css'; import '/src/shadcn.css';
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(MakeApp, {session: {user: {id: 'test-user', emailVerified: true}, session: {token: 'test-session'}}}));
  ` }))
  await page.route('https://fontes-api.bymarreco.com/**', route => route.fulfill({ json: [] }))
  await page.route('**/api/**', async route => {
    const req = route.request()
    if (!req.url().includes('/api/briefing')) return route.fulfill({ json: {} })
    assert.equal(req.headers().authorization, 'Bearer test-session')
    if (new URL(req.url()).pathname === '/api/briefing/feedback') {
      assert.equal(new URL(req.url()).searchParams.get('generation_id'), 'saved-1')
      if (feedbackFails) return route.fulfill({ status: 503, json: {} })
      if (req.method() === 'POST') rating = req.postDataJSON().rating
      return route.fulfill({ json: { rating } })
    }
    if (req.method() === 'POST') {
      generated++
      const body = req.postDataJSON()
      assert.equal(Date.parse(body.until) - Date.parse(body.from), 86400000)
      assert.match(body.until, /:\d{2}Z$/)
      assert.ok(Date.parse(body.until) <= Date.now())
      return route.fulfill({ status: 201, json: { briefing: { ...briefing, text: 'Novo resumo.', segments: [] }, cached: false } })
    }
    reads++
    if (heldRead) await heldRead
    return route.fulfill({ status, json: status === 200 ? { briefing, stale: true } : { code: 'BRIEFING_NOT_GENERATED' } })
  })
  const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5173'
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin })
  const open = () => page.goto(origin)
  await open()
  await page.getByRole('link', { name: 'habitação' }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'habitação' }).getAttribute('href'), '/historias/42')
  assert.equal(await page.getByText('O resumo pode estar desatualizado.', { exact: false }).count(), 0)
  let releaseRead
  heldRead = new Promise(resolve => { releaseRead = resolve })
  await page.getByRole('button', { name: 'Atualizar resumo' }).click()
  await page.getByRole('status', { name: 'A carregar o resumo' }).waitFor()
  const loadingHeight = await page.locator('.home-briefing-text').evaluate(el => el.getBoundingClientRect().height)
  releaseRead()
  heldRead = null
  await page.waitForFunction(() => !document.querySelector('.home-briefing-refresh').disabled)
  assert.equal(await page.locator('.home-briefing-unwritten').count(), 1)
  await page.waitForFunction(() => document.querySelector('.home-briefing-text').getAttribute('aria-busy') === 'false')
  assert.equal(await page.locator('.home-briefing-text').evaluate(el => el.getBoundingClientRect().height), loadingHeight)
  assert.equal(await page.locator('.home-briefing-copy').innerText(), briefing.segments.map(s => s.text).join(''))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Atualizar resumo' }).click()
  await page.waitForFunction(() => !document.querySelector('.home-briefing-refresh').disabled)
  assert.equal(await page.locator('.home-briefing-text').getAttribute('aria-busy'), 'false')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const search = await page.locator('.make-search').boundingBox()
    const summary = await page.locator('.home-briefing').boundingBox()
    assert.ok(summary.y >= search.y + search.height)
    assert.ok(summary.x >= 0 && summary.x + summary.width <= width)
  }
  assert.equal(generated, 0)
  const footerBefore = await page.locator('.home-briefing-footer').boundingBox()
  await page.getByRole('button', { name: 'Copiar resumo', exact: true }).click()
  await page.getByText('Resumo copiado.', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), briefing.text)
  assert.equal(await page.getByRole('button', { name: 'Copiar resumo', exact: true }).getAttribute('title'), 'Copiado')
  assert.deepEqual(await page.locator('.home-briefing-footer').boundingBox(), footerBefore)
  await page.getByRole('button', { name: 'Avaliação do resumo', exact: true }).click()
  await page.getByRole('button', { name: 'Útil', exact: true }).click()
  await page.getByText('Avaliação guardada.', { exact: true }).waitFor()
  assert.equal(rating, 'up')
  await open()
  await page.getByRole('button', { name: 'Avaliação do resumo', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Útil', exact: true }).getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: 'Não útil', exact: true }).click()
  await page.getByText('Avaliação guardada.', { exact: true }).waitFor()
  assert.equal(rating, 'down')
  await page.getByRole('button', { name: 'Avaliação do resumo', exact: true }).click()
  await page.getByRole('button', { name: 'Não útil', exact: true }).click()
  await page.getByText('Avaliação removida.', { exact: true }).waitFor()
  assert.equal(rating, null)
  await page.getByRole('button', { name: 'Avaliação do resumo', exact: true }).click()
  await page.getByRole('button', { name: 'Útil', exact: true }).waitFor()
  feedbackFails = true
  await page.getByRole('button', { name: 'Útil', exact: true }).click()
  await page.getByText('Não foi possível guardar a avaliação. Nova tentativa disponível.').waitFor()
  assert.equal(rating, null)
  feedbackFails = false
  const readsBeforeCache = reads
  await open()
  await page.getByRole('link', { name: 'habitação' }).waitFor()
  assert.equal(await page.locator('.home-briefing-text').getAttribute('aria-busy'), 'false')
  assert.equal(await page.locator('.home-briefing-unwritten').count(), 0)
  assert.equal(reads, readsBeforeCache)
  await page.evaluate(() => localStorage.clear())
  status = 404
  await open()
  await page.getByText('Ainda não existe um resumo disponível.').waitFor()
  status = 503
  await open()
  await page.getByRole('alert').waitFor()
  status = 200
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByRole('link', { name: 'habitação' }).waitFor()
  await page.evaluate(() => localStorage.clear())
  status = 401
  await open()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Gerar resumo de 24 horas' }).count(), 0)
  assert.deepEqual(errors, [])
  console.log('Briefing checks passed: placement, mobile width, bearer auth, saved summary, links, refresh skeleton, typing reveal, local cache, reduced motion, clipboard, persisted feedback, feedback errors, empty state, retry, expired session.')
} finally {
  await browser.close()
}
