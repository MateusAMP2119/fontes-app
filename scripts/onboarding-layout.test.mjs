// Layout check for the code screen: the CSS `order` values decide what the reader sees,
// so assert the painted order against a real engine, with no dev server involved.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
const css = readFileSync('src/Onboarding.css', 'utf8')
const html = `<style>${css}</style>
<main class="ob-page"><div class="ob-stage"><section class="ob-panel ob-code"><header><h1>Email de confirmação</h1><p>Foi enviado um email.</p></header>
<form>
  <input class="ob-code" placeholder="Introduzir código">
  <input type="email" placeholder="Endereço de email">
  <button class="ob-button ob-primary ob-wide">Continuar com código</button>
  <button type="button" class="ob-subtle ob-resend" id="resend">Reenviar código</button>
  <button type="button" class="ob-subtle ob-centered" id="back">Voltar ao início</button>
  <div class="ob-progress"><span></span><span class="current"></span></div>
  <p class="ob-notice">aviso</p>
</form></section></div></main>`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
await page.setContent(html)
const y = async sel => (await page.locator(sel).boundingBox()).y
const [resend, dots, back, notice] = await Promise.all([y('#resend'), y('.ob-progress'), y('#back'), y('.ob-notice')])
assert.ok(resend < dots, 'Reenviar código sits above the step counter')
assert.ok(dots < back, 'Voltar ao início sits below the step counter')
assert.ok(back < notice, 'the notice stays last')
assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).textAlign), 'center')
assert.equal(await page.locator('.ob-progress').evaluate(el => getComputedStyle(el).justifyContent), 'center')
assert.equal(await page.locator('input.ob-code').evaluate(el => getComputedStyle(el).textAlign), 'center')
assert.equal(await page.locator('input[type=email]').evaluate(el => getComputedStyle(el).textAlign), 'center')
const gap = async () => {
  const dots = await page.locator('.ob-progress').boundingBox()
  const link = await page.locator('#back').boundingBox()
  return link.y - (dots.y + dots.height)
}
const run = await page.locator('.ob-primary').boundingBox()
const resendBox = await page.locator('#resend').boundingBox()
assert.ok(resendBox.y - (run.y + run.height) < 18, 'the resend link hugs the run button')
const wide = await gap()
await page.setViewportSize({ width: 390, height: 844 })
const narrow = await gap()
assert.ok(narrow < wide - 3, `phone tightens the counter/back gap (${narrow} vs ${wide})`)
await browser.close()
console.log('ok: reenviar → contador → voltar, centred')
