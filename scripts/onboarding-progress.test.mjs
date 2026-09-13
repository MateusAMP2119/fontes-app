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
      [{ step: 'email', returning: false, provider: 'google' }, 'Passo 1 de 7'],
      [{ step: 'code', returning: false, provider: 'google' }, 'Passo 2 de 7'],
      [{ step: 'email', returning: true, provider: 'email' }, 'Passo 1 de 2'],
      [{ step: 'code', returning: true, provider: 'email' }, 'Passo 2 de 2'],
      [{ step: 'workspace', returning: false, provider: 'google' }, 'Passo 1 de 4'],
      [{ step: 'updates', returning: false, provider: 'email' }, 'Passo 7 de 7'],
    ]) {
      await page.evaluate(draft => localStorage.setItem('fontes:onboarding-ui-preview:v1', JSON.stringify(draft)), draft)
      await page.reload()
      await page.locator('#ob-title:focus').waitFor()
      const counter = page.locator('.ob-progress')
      if (draft.returning && ['email', 'code'].includes(draft.step)) { assert.equal(await counter.count(), 0, 'signing in has no stepper'); continue }
      assert.equal(await counter.getAttribute('aria-label'), expected)
      assert.equal(await counter.locator('.current').count(), 1)
      const [current, total] = expected.match(/\d+/g).map(Number)
      assert.equal(await counter.locator('button').count(), total)
      assert.equal(await counter.locator('.past').count(), current - 1)
      await counter.evaluate(el => Promise.all(el.parentElement.getAnimations({ subtree: true }).map(animation => animation.finished)))
      const dots = await counter.locator('button').evaluateAll(els => els.map(el => {
        const box = el.getBoundingClientRect()
        return { width: box.width, height: box.height }
      }))
      assert.ok(dots.every(dot => dot.height >= 6.5 && dot.width >= 6.5), 'dots stay visible')
    }
    // The stepper navigates: a screen already answered is reachable, and one accepted once stays
    // reachable after its field is emptied, so nothing has to be filled in twice.
    await page.evaluate(() => localStorage.setItem('fontes:onboarding-ui-preview:v1', JSON.stringify({ step: 'code', returning: false, provider: 'email', email: 'a@b.pt' })))
    await page.reload()
    await page.locator('#ob-title:focus').waitFor()
    const dot = name => page.locator('.ob-progress button').nth(['email', 'code', 'password', 'workspace', 'profile', 'invites', 'updates'].indexOf(name))
    assert.equal(await dot('password').isDisabled(), true, 'an unanswered screen blocks the one after it')
    await page.fill('#ob-code-input', '123456')
    assert.equal(await dot('password').isDisabled(), false, 'a filled code opens the next screen without waiting')
    await dot('password').click()
    await page.locator('.ob-panel.ob-password').waitFor()
    assert.equal(await page.locator('#ob-title').textContent(), 'Definir palavra-passe')
    await dot('code').click()
    await page.locator('.ob-panel.ob-code').waitFor()
    assert.equal(await page.inputValue('#ob-code-input'), '123456', 'the code survives the trip back')
    await page.fill('#ob-code-input', '')
    assert.equal(await dot('password').isDisabled(), false, 'a screen accepted once stays accepted')
    console.log(`${engine.name()}: restored flows, returning-user setup, active step counts and stepper navigation passed`)
  } finally { await browser.close() }
}
