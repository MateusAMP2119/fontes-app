import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5184'
for (const engine of [chromium, webkit]) {
 const browser = await engine.launch()
 try {
  for (const width of [320, 390, 1440]) for (const colorScheme of ['dark', 'light']) {
   const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme, serviceWorkers: 'block' })
   await page.route('**/api/**', route => route.fulfill({ json: null }))
   await page.goto(origin + '/onboarding-preview')
   const choose = name => page.getByRole('navigation', { name: 'Ecrãs' }).getByRole('button', { name, exact: true }).click()
   await choose('Email')
   const email = page.getByRole('textbox', { name: 'Endereço de email', exact: true })
   const geometry = async () => {
    await page.evaluate(() => document.fonts.ready)
    await page.locator('.ob-stage').evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished)))
    return page.locator('.ob-brand, .ob-stage h1, form, form input:not([type=file]), form textarea, form button, form a').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return [r.x + scrollX, r.y + scrollY, r.width, r.height] }))
   }
   const unchanged = async before => {
    const after = await geometry()
    assert.equal(after.length, before.length)
    after.forEach((box, i) => {
     // Feedback may expand vertically, but the brand/title stay anchored and
     // fields and controls keep their dimensions and horizontal alignment.
     for (const j of [0, 2, ...(i < 2 ? [1, 3] : i > 2 ? [3] : [])]) {
      assert.ok(Math.abs(box[j] - before[i][j]) < 1, `feedback changed control ${i} dimension ${j} at ${width}px`)
     }
    })
   }
   await email.fill('invalid')
   const emailGeometry = await geometry()
   await page.getByRole('button', { name: 'Continuar com email', exact: true }).click()
   const error = page.getByRole('alert')
   assert.match(await error.textContent(), /email inválido/)
   await unchanged(emailGeometry)
   assert.equal(await email.getAttribute('aria-invalid'), 'true')
   await email.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
   const border = await email.evaluate(el => getComputedStyle(el).borderTopColor.match(/\d+/g).map(Number))
   assert.ok(border[0] > border[1] && border[0] > border[2], 'invalid border remains red while focused')
   assert.equal(await email.getAttribute('aria-describedby'), await error.getAttribute('id'))
   const inputBox = await email.boundingBox(), errorBox = await error.boundingBox()
   assert.ok(Math.abs(errorBox.y - inputBox.y - inputBox.height - 8) < 1, 'error sits beneath its input')
   assert.equal(await page.locator('.ob-toast').count(), 0, 'field validation does not create a toast')
   await email.fill('valid@example.com')
   assert.equal(await error.count(), 0, 'editing clears the field error')
   assert.equal(await email.getAttribute('aria-invalid'), null)
   await unchanged(emailGeometry)
   await choose('Palavra-passe')
   const passwordGeometry = await geometry()
   const savePassword = page.getByRole('button', { name: 'Guardar palavra-passe', exact: true })
   assert.equal(await savePassword.isDisabled(), true, 'empty passwords cannot submit')
   await page.locator('input[name=password]').fill('short')
   assert.equal(await savePassword.isDisabled(), true, 'short passwords cannot submit')
   await page.locator('input[name=password]').fill('valid-password')
   assert.equal(await savePassword.isDisabled(), false)
   assert.equal(await error.count(), 0)
   await unchanged(passwordGeometry)
   for (const [screen, button, field, valid] of [
    ['Código', 'Continuar com código', /^Código (?:temporário|de confirmação)$/, '123456'],
    ['Ambiente', 'Criar ambiente', 'Nome', 'Equipa'],
    ['Perfil', 'Continuar', 'Nome do perfil', 'Pessoa'],
    ['Convites', 'Enviar convite por email', 'Emails dos membros', 'valid@example.com'],
   ]) {
    await choose(screen)
    const input = page.getByRole('textbox', { name: field, exact: true })
    await input.fill(screen === 'Convites' ? 'invalid' : '')
    const before = await geometry()
    await page.getByRole('button', { name: button, exact: true }).click()
    await page.getByRole('alert').waitFor()
    await unchanged(before)
    await input.fill(valid)
    // Invitation button wording stays the same while the entered address is corrected.
    await unchanged(before)
   }
   await choose('Código')
   await page.getByRole('button', { name: 'Reenviar código', exact: true }).click()
   const toast = page.locator('.ob-toast')
   await toast.getByRole('status').waitFor()
   await toast.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
   const toastBox = await toast.boundingBox(), previewBox = await page.locator('.ob-preview-bar').boundingBox()
   assert.ok(toastBox.x >= 16 && toastBox.x + toastBox.width <= width - 16)
   assert.ok(toastBox.y + toastBox.height < previewBox.y, 'toast clears preview controls')
   await page.getByRole('button', { name: 'Fechar notificação', exact: true }).click()
   assert.equal(await toast.count(), 0)
   await page.emulateMedia({ reducedMotion: 'reduce' })
   await page.getByRole('button', { name: 'Reenviar código', exact: true }).click()
   assert.equal(await toast.evaluate(el => el.getAnimations().length), 0)
   await page.goto(origin + '/reset-password')
   const recoveryGeometry = await geometry()
   await page.getByRole('button', { name: 'Enviar link de recuperação', exact: true }).click()
   assert.match(await page.getByRole('alert').textContent(), /email inválido/)
   await unchanged(recoveryGeometry)
   await page.getByRole('textbox', { name: 'Email', exact: true }).fill('valid@example.com')
   assert.equal(await page.getByRole('alert').count(), 0)
   await unchanged(recoveryGeometry)
   await page.close()
  }
  console.log(`${engine.name()}: inline validation, editing recovery, accessible associations, toast dismissal, mobile placement and reduced motion passed in both themes`)
 } finally { await browser.close() }
}
