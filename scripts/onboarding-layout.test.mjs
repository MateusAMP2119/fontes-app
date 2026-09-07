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
  <input type="file" id="picker" hidden>
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
// The profile screen's image picker is a hidden input inside the form: the panel's own
// display rule must not paint it as a control.
assert.equal(await page.locator('#picker').evaluate(el => getComputedStyle(el).display), 'none', 'a hidden input stays hidden')
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
// The workspace screen's foot: the counter, the account line and the email link read as one group.
await page.setViewportSize({ width: 1440, height: 950 })
await page.setContent(`<style>${css}</style>
<main class="ob-page"><div class="ob-stage"><section class="ob-panel ob-workspace"><header><h1>Criar novo ambiente de trabalho</h1><p>Ambientes de trabalho estão desenhados para colaboração.</p></header>
<form>
  <label class="ob-field" id="name"><span>Nome</span><input placeholder="Nome do ambiente de trabalho"></label>
  <label class="ob-field" id="url"><span>URL</span><input placeholder="nome-da-equipa"></label>
  <button class="ob-button ob-primary ob-wide" id="create">Criar ambiente</button>
  <div class="ob-account-note"><p id="for">Ambiente para <span>zz@xx.com</span></p><button type="button" class="ob-subtle" id="other">Utilizar um email diferente</button></div>
  <div class="ob-progress"><span class="current"></span><span></span></div>
</form></section></div></main>`)
const counter = await page.locator('.ob-progress').boundingBox()
const name = await page.locator('#name').boundingBox()
const url = await page.locator('#url').boundingBox()
const create = await page.locator('#create').boundingBox()
// It rides the shared rhythm, so its controls space exactly as the code screen's do.
const near = (got, want, what) => assert.ok(Math.abs(got - want) < 2, `${what} (${got} vs ${want})`)
near(url.y - (name.y + name.height), 24, 'the two fields sit a form gap apart')
const head = await page.locator('.ob-workspace header').boundingBox()
near(name.y - (head.y + head.height), 32, 'the fields follow the lede at the header gap')
near(counter.y - (create.y + create.height), 24, 'the counter sits a form gap under the run button')
assert.ok((await page.locator('#name span').boundingBox()).width <= 1, 'the field label is out of sight')
assert.equal(await page.locator('#name span').textContent(), 'Nome', 'and still names the input')
const note = await page.locator('#for').boundingBox()
const other = await page.locator('#other').boundingBox()
assert.ok(note.y - (counter.y + counter.height) < 12, `the account line follows the counter closely (${note.y - (counter.y + counter.height)})`)
assert.ok(other.y - (note.y + note.height) < 8, 'the email link follows the account line closely')
await browser.close()
console.log('ok: reenviar → contador → voltar, centred')
