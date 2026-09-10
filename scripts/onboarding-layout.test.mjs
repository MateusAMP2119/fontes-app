import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'

// Exercise the mounted application: the shell must survive actual step changes.
const url = process.env.ONBOARDING_TEST_URL || 'http://localhost:5173/onboarding-preview'
for (const engine of [chromium, webkit]) {
 const browser = await engine.launch()
 try {
  for (const viewport of [{ width: 1440, height: 950 }, { width: 390, height: 844 }]) {
   const page = await browser.newPage({ viewport })
   await page.goto(url)
   const grid = page.locator('.ob-background .make-background-grid')
   assert.match(await grid.evaluate(el => getComputedStyle(el).maskImage), /onboarding-grid\.svg/, 'onboarding uses the shared grid asset')
   const gridAsset = await page.request.get(new URL('/onboarding-grid.svg', url).href)
   assert.equal(gridAsset.status(), 200)
   assert.match(await gridAsset.text(), /<svg/, 'grid URL serves SVG rather than the SPA fallback')
   await page.evaluate(() => document.fonts.ready)
   const screens = page.getByRole('navigation', { name: 'Ecrãs' })
   const choose = name => screens.getByRole('button', { name, exact: true }).click()
   const settle = () => page.locator('.ob-stage').evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished)))
   const anchors = () => page.evaluate(() => Object.fromEntries(['.ob-brand', '#ob-title', '.ob-step-content'].map(selector => [selector, document.querySelector(selector).getBoundingClientRect().top + scrollY])))
   await choose('Email'); await settle()
   const initial = await anchors()
   await page.evaluate(() => {
    window.shell = { brand: document.querySelector('.ob-brand'), heading: document.querySelector('.ob-step-heading'), title: document.querySelector('#ob-title'), progress: document.querySelector('.ob-progress'), firstDot: document.querySelector('.ob-progress button'), content: document.querySelector('.ob-step-content') }
   })
   await choose('Código')
   const transition = await page.evaluate(() => ({
    staticNodes: window.shell.brand === document.querySelector('.ob-brand') && window.shell.heading === document.querySelector('.ob-step-heading') && window.shell.title === document.querySelector('#ob-title') && window.shell.progress === document.querySelector('.ob-progress') && window.shell.firstDot === document.querySelector('.ob-progress button'),
    newContent: window.shell.content !== document.querySelector('.ob-step-content'),
    formAnimation: document.querySelector('.ob-step-content').getAnimations().length > 0,
    progressAnimation: document.querySelector('.ob-progress').getAnimations({ subtree: true }).length > 0,
   }))
   assert.equal(transition.staticNodes, true, 'brand, heading and stepper keep their DOM identity')
   assert.equal(transition.newContent, true)
   assert.equal(transition.formAnimation, true, 'only incoming form content animates')
   assert.equal(transition.progressAnimation, true, 'the mounted stepper animates between steps')
   for (const screen of ['Código', 'Palavra-passe', 'Ambiente', 'Perfil', 'Convites', 'Atualizações', 'Início', 'Email']) {
    await choose(screen); await settle()
    const current = await anchors()
    for (const selector of Object.keys(initial)) assert.ok(Math.abs(current[selector] - initial[selector]) < 1, `${screen}: ${selector} stays anchored at ${JSON.stringify(viewport)}`)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${screen}: no horizontal overflow`)
    const progress = page.locator('.ob-progress')
    if (await progress.count()) {
     const dots = await progress.boundingBox(), brand = await page.locator('.ob-brand').boundingBox()
     assert.ok(brand.y - dots.y - dots.height >= 23, 'stepper stays above the logo with a stable gap')
    }
   }
   await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
   await choose('Código')
   assert.equal(await page.locator('.ob-step-content').evaluate(el => el.getAnimations().length), 0)
   assert.equal(await page.locator('.ob-progress').evaluate(el => el.getAnimations({ subtree: true }).length), 0)
   await page.getByRole('textbox', { name: /^Código (?:temporário|de confirmação)$/ }).fill('123456')
   await page.getByRole('button', { name: 'Continuar com código', exact: true }).click()
   await page.getByRole('heading', { name: 'Definir palavra-passe', exact: true }).waitFor()
   await page.close()
  }
  console.log(`${engine.name()}: stable shell, heading and form anchors; animated top stepper; reduced motion and mobile layout passed`)
 } finally { await browser.close() }
}
