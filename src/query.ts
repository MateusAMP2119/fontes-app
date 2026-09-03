/**
 * The hero's query card, ported from fontes-spa/src/scripts/query.ts: a real
 * input whose placeholder types the mode's phrases, tabs under a measured
 * sliding indicator, canvas glyphs that pulse on selection, a run button
 * that grows its label once the field is dirty.
 */

type ModeKey = 'search' | 'build'

const MODES: Record<ModeKey, { label: string; phrases: string[] }> = {
  search: {
    label: 'Procurar',
    phrases: [
      'Notícias de energia em Espanha',
      'Lançamentos da concorrência este mês',
      'Menções à marca nas últimas 24 horas',
    ],
  },
  build: {
    label: 'Construir',
    phrases: [
      'Relatório semanal do sector da habitação',
      'Alerta para greves nos transportes',
      'Painel de tendências do retalho ibérico',
    ],
  },
}

// the kicker's pair deepened: #A3ECE9/#709FF5 washed out at glyph alphas; the blue is attio's blue-500
const TRAIL: [string, string] = ['#48C9D9', '#266DF0']
const TYPE_MS = 55
const HOLD_MS = 1400
const ERASE_MS = 28
const FRAME_MS = 40

// Logical size comes from offsetWidth (unaffected by CSS zoom); the backing
// store follows the rendered rect so glyphs stay crisp under .make-stage's zoom.
function sizeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const rect = canvas.getBoundingClientRect()
  const zoom = canvas.offsetWidth ? rect.width / canvas.offsetWidth : 1
  const scale = Math.min(window.devicePixelRatio || 1, 2) * zoom
  const width = Math.max(1, Math.round(canvas.offsetWidth * scale))
  const height = Math.max(1, Math.round(canvas.offsetHeight * scale))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const context = canvas.getContext('2d')
  context?.setTransform(scale, 0, 0, scale, 0, 0)
  return context
}

// a 4×4 matrix of 2px cells on a 4px pitch inside the 20px glyph box
function paintIcon(canvas: HTMLCanvasElement, mode: ModeKey, elapsed: number, active: boolean): void {
  const context = sizeCanvas(canvas)
  if (!context) return
  context.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
  const trail = context.createLinearGradient(3, 3, 17, 17)
  trail.addColorStop(0, TRAIL[0])
  trail.addColorStop(1, TRAIL[1])
  context.fillStyle = trail

  if (mode === 'build') {
    const rowAlpha = [0.2, 0.4, 1, 0.12]
    const activeRow = active && elapsed < 800 ? Math.floor(elapsed / 50) % 4 : -1
    for (let cell = 0; cell < 16; cell += 1) {
      const row = Math.floor(cell / 4)
      context.globalAlpha = row === activeRow ? 1 : rowAlpha[row]
      context.fillRect(3 + (cell % 4) * 4, 3 + row * 4, 2, 2)
    }
    context.globalAlpha = 1
    return
  }

  const base = [0, 0.2, 0.4, 0, 0.4, 1, 0.4, 0.2, 0.2, 0.4, 1, 0.4, 0, 0.4, 0.2, 0]
  const variance = [0.24, 0.31, 0.36, 0.22, 0.29, 0.6, 0.6, 0.34, 0.27, 0.6, 0.6, 0.32, 0.21, 0.38, 0.26, 0.35]
  const pulse = active && elapsed < 900 ? 1 - Math.abs(((elapsed % 300) / 150) - 1) : 0
  for (let cell = 0; cell < 16; cell += 1) {
    if ([0, 3, 12, 15].includes(cell)) continue
    const cap = [5, 6, 9, 10].includes(cell) ? 1 : 0.4
    const value = base[cell] + pulse * variance[cell]
    context.globalAlpha = Math.min(Math.min(value, cap) - Math.max(value - cap, 0), 1)
    context.fillRect(3 + (cell % 4) * 4, 3 + 4 * Math.floor(cell / 4), 2, 2)
  }
  context.globalAlpha = 1
}

export function mountQuery(card: HTMLElement): () => void {
  const input = card.querySelector<HTMLInputElement>('[data-q-input]')
  const buttons = Array.from(card.querySelectorAll<HTMLButtonElement>('[data-q-mode]'))
  const indicator = card.querySelector<HTMLElement>('.m-tabs-ind')
  const runLabel = card.querySelector<HTMLElement>('[data-q-run-label]')
  const icons = Array.from(card.querySelectorAll<HTMLCanvasElement>('[data-q-icon]'))
  if (!input || !buttons.length) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let mode: ModeKey = 'search'
  let phraseIndex = 0
  let characterIndex = 0
  let deleting = false
  let typeTimer = 0
  let frameTimer = 0
  let activatedAt = performance.now()
  let focused = false
  let visible = true

  const clearTyping = () => window.clearTimeout(typeTimer)

  const typeStep = () => {
    if (!visible || document.hidden || focused || input.value || reducedMotion.matches) return
    const phrases = MODES[mode].phrases
    const phrase = phrases[phraseIndex % phrases.length]
    if (deleting) {
      characterIndex -= 1
      input.placeholder = phrase.slice(0, Math.max(0, characterIndex))
      if (characterIndex === 0) {
        deleting = false
        phraseIndex = (phraseIndex + 1) % phrases.length
      }
      typeTimer = window.setTimeout(typeStep, ERASE_MS)
      return
    }
    characterIndex += 1
    input.placeholder = phrase.slice(0, characterIndex)
    if (characterIndex === phrase.length) {
      deleting = true
      typeTimer = window.setTimeout(typeStep, HOLD_MS)
      return
    }
    typeTimer = window.setTimeout(typeStep, TYPE_MS)
  }

  const restartTyping = (delay = TYPE_MS) => {
    clearTyping()
    characterIndex = 0
    deleting = false
    input.placeholder = reducedMotion.matches ? MODES[mode].phrases[0] : ''
    if (!reducedMotion.matches && visible && !document.hidden && !focused && !input.value) {
      typeTimer = window.setTimeout(typeStep, delay)
    }
  }

  const updateDirty = () => {
    const dirty = input.value.length > 0
    card.classList.toggle('is-dirty', dirty)
    if (runLabel) runLabel.textContent = dirty ? MODES[mode].label : ''
    if (dirty) clearTyping()
    else if (!focused) restartTyping(180)
  }

  // Viewport rects divided by the well's CSS height (36px in .m-tabs) give CSS px
  // inside the well; offsetLeft/translate drift under the card's nested zoom per engine.
  const placeIndicator = (button: HTMLButtonElement) => {
    const well = indicator?.parentElement
    if (!indicator || !well) return
    const wellBox = well.getBoundingClientRect()
    const box = button.getBoundingClientRect()
    const k = wellBox.height / 36 || 1
    indicator.style.left = `${(box.left - wellBox.left) / k}px`
    indicator.style.width = `${Math.max(0, box.width / k - 1)}px`
  }

  const paintIcons = (elapsed = performance.now() - activatedAt) => {
    for (const canvas of icons) {
      const iconMode = canvas.dataset.qIcon as ModeKey
      paintIcon(canvas, iconMode, elapsed, iconMode === mode)
    }
  }

  const selectMode = (next: ModeKey) => {
    mode = next
    activatedAt = performance.now()
    phraseIndex = 0
    for (const button of buttons) {
      const selected = button.dataset.qMode === next
      button.setAttribute('aria-selected', String(selected))
      if (selected) placeIndicator(button)
    }
    if (runLabel && input.value) runLabel.textContent = MODES[next].label
    restartTyping(180)
    paintIcons(0)
  }

  const startFrames = () => {
    window.clearInterval(frameTimer)
    if (reducedMotion.matches || !visible) {
      paintIcons(1000)
      return
    }
    frameTimer = window.setInterval(() => paintIcons(), FRAME_MS)
  }

  for (const button of buttons) {
    button.addEventListener(
      'click',
      () => {
        const next = button.dataset.qMode as ModeKey | undefined
        if (next && next in MODES) selectMode(next)
      },
      { signal },
    )
  }

  input.addEventListener(
    'focus',
    () => {
      focused = true
      clearTyping()
      if (!input.value) input.placeholder = ''
    },
    { signal },
  )
  input.addEventListener(
    'blur',
    () => {
      focused = false
      if (!input.value) restartTyping(220)
    },
    { signal },
  )
  input.addEventListener('input', updateDirty, { signal })

  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      if (visible) {
        if (!focused && !input.value) restartTyping(250)
        startFrames()
      } else {
        clearTyping()
        window.clearInterval(frameTimer)
      }
    },
    { rootMargin: '160px 0px' },
  )
  intersection.observe(card)

  const onVisibilityChange = () => {
    if (document.hidden) {
      clearTyping()
      window.clearInterval(frameTimer)
    } else if (visible) {
      if (!focused && !input.value) restartTyping(250)
      startFrames()
    }
  }
  const onResize = () => {
    const selected = buttons.find((button) => button.getAttribute('aria-selected') === 'true')
    if (selected) placeIndicator(selected)
    paintIcons()
  }
  const onMotionChange = () => {
    if (reducedMotion.matches) clearTyping()
    restartTyping()
    startFrames()
  }
  document.addEventListener('visibilitychange', onVisibilityChange, { signal })
  window.addEventListener('resize', onResize, { signal })
  reducedMotion.addEventListener('change', onMotionChange, { signal })

  const initial = buttons.find((button) => button.getAttribute('aria-selected') === 'true')
  if (indicator && initial) {
    indicator.style.transition = 'none'
    placeIndicator(initial)
    window.requestAnimationFrame(() => {
      indicator.style.transition = ''
    })
  }
  void document.fonts?.ready.then(onResize)
  paintIcons(0)
  restartTyping(700)
  startFrames()
  if (reducedMotion.matches) onMotionChange()

  return () => {
    clearTyping()
    window.clearInterval(frameTimer)
    intersection.disconnect()
    controller.abort()
  }
}
