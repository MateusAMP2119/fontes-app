import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'

// Start Vite first. Preview mode never sends auth requests.
const url = process.env.ONBOARDING_TEST_URL || 'http://localhost:5173/onboarding-preview'
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await page.goto(url)
    const screens = page.getByRole('navigation', { name: 'Ecrãs' })
    const anchor = () => page.locator('.ob-brand').evaluate(el => el.getBoundingClientRect().top + window.scrollY)
    const originalAnchor = await anchor()
    for (const screen of ['Email', 'Código', 'Ambiente', 'Perfil', 'Convites', 'Atualizações']) {
      await screens.getByRole('button', { name: screen, exact: true }).click()
      await page.locator('#ob-title:focus').waitFor()
      assert.ok(Math.abs(await anchor() - originalAnchor) < 1, `${screen}: brand stays anchored`)
      for (const field of await page.locator('.ob-panel input:not([type=checkbox]):not([type=file]), .ob-panel textarea').all()) {
        assert.ok(await field.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16), `${screen}: readable input avoids focus zoom`)
        await field.focus()
        await field.fill(screen === 'Código' ? '123456' : 'teste')
        assert.equal(await page.evaluate(() => visualViewport.scale), 1)
      }
      await page.setViewportSize({ width: 390, height: 500 })
      assert.ok(Math.abs(await anchor() - originalAnchor) < 1, `${screen}: viewport height does not recenter the form`)
      const lastControl = page.locator('.ob-panel button').last()
      await lastControl.scrollIntoViewIfNeeded()
      const box = await lastControl.boundingBox()
      assert.ok(box.y >= -1 && box.y + box.height <= 501, `${screen}: controls remain reachable in a short viewport (${JSON.stringify(box)})`)
      await page.setViewportSize({ width: 390, height: 844 })
      assert.equal(await page.locator('.ob-page').evaluate(el => el.scrollWidth <= el.clientWidth), true, `${screen}: no horizontal overflow`)
    }
    console.log(`${engine.name()}: mobile step anchors, input sizing, viewport resizing and scroll reachability passed`)
  } finally {
    await browser.close()
  }
}
