import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'

const url = process.env.ONBOARDING_TEST_URL || 'http://localhost:5173/onboarding-preview'
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.goto(url)
    await page.locator('#ob-title:focus').waitFor()
    for (const [draft, expected] of [
      [{ step: 'workspace', returning: true, provider: 'email' }, 'Passo 1 de 4'],
      [{ step: 'profile', returning: true, provider: 'email' }, 'Passo 2 de 4'],
      [{ step: 'email', returning: false, provider: 'google' }, 'Passo 1 de 6'],
      [{ step: 'code', returning: false, provider: 'google' }, 'Passo 2 de 6'],
      [{ step: 'email', returning: true, provider: 'email' }, 'Passo 1 de 2'],
      [{ step: 'code', returning: true, provider: 'email' }, 'Passo 2 de 2'],
      [{ step: 'workspace', returning: false, provider: 'google' }, 'Passo 1 de 4'],
      [{ step: 'updates', returning: false, provider: 'email' }, 'Passo 6 de 6'],
    ]) {
      await page.evaluate(draft => localStorage.setItem('fontes:onboarding-ui-preview:v1', JSON.stringify(draft)), draft)
      await page.reload()
      await page.locator('#ob-title:focus').waitFor()
      const counter = page.locator('.ob-progress')
      assert.equal(await counter.getAttribute('aria-label'), expected)
      assert.equal(await counter.locator('.current').count(), 1)
      const [current, total] = expected.match(/\d+/g).map(Number)
      assert.equal(await counter.locator('span').count(), total)
      assert.equal(await counter.locator('.past').count(), current - 1)
      const dots = await counter.locator('span').evaluateAll(els => els.map(el => {
        const box = el.getBoundingClientRect()
        return { width: box.width, height: box.height }
      }))
      assert.ok(dots.every(dot => dot.height >= 6.5 && dot.width >= 6.5), 'dots stay visible')
    }
    console.log(`${engine.name()}: restored flows, returning-user setup and active step counts passed`)
  } finally { await browser.close() }
}
