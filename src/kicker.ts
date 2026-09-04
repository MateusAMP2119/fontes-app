/**
 * The kicker's border light, ported from fontes-spa/src/scripts/kicker.ts
 * (attio.com's AnimatedKicker): a conic gradient one px outside the pill's
 * padding box, the plate covering all of it but the ring. The gradient's
 * centre slides along an edge with the angle held, then holds at the corner
 * while the angle turns 90deg; the keyframe offsets are those legs' shares
 * of the perimeter, so the head runs the whole ring at one speed. A rAF
 * loop interpolates the three custom properties itself: WAAPI keyframes on
 * custom properties do not interpolate on iOS Safari. Runs only on screen,
 * under reduced motion too, so every phone shows the same ring.
 */
const DURATION_MS = 6000
const RADIUS = 13
const ANGLES = [-80, -80, 10, 10, 100, 100, 190, 190, 280]

interface Ring {
  xs: number[]
  ys: number[]
  at: number[]
}

export function mountKicker(pill: HTMLElement): () => void {
  const glow = pill.querySelector<HTMLElement>('.m-kick-glow')
  if (!glow) return () => {}
  let ring: Ring | undefined
  let raf = 0
  let onScreen = true
  const t0 = performance.now()

  const frame = (now: number) => {
    raf = 0
    if (!ring || !onScreen) return
    const { xs, ys, at } = ring
    const u = ((now - t0) % DURATION_MS) / DURATION_MS
    let i = 0
    while (i < at.length - 2 && u >= at[i + 1]) i += 1
    const span = at[i + 1] - at[i]
    const k = span > 0 ? (u - at[i]) / span : 0
    const lerp = (p: number[]) => p[i] + (p[i + 1] - p[i]) * k
    glow.style.setProperty('--kick-a', `${lerp(ANGLES)}deg`)
    glow.style.setProperty('--kick-x', `${lerp(xs)}px`)
    glow.style.setProperty('--kick-y', `${lerp(ys)}px`)
    raf = requestAnimationFrame(frame)
  }
  const start = () => {
    if (!raf && ring && onScreen) raf = requestAnimationFrame(frame)
  }

  const measure = () => {
    const w = glow.offsetWidth
    const h = glow.offsetHeight
    const a = Math.min(RADIUS, w / 2, h / 2) // the browser clamps the CSS radius the same way
    if (!w || !h) {
      ring = undefined
      return
    }
    const sx = w - 2 * a
    const sy = h - 2 * a
    const arc = (2 * Math.PI * a) / 4
    const per = 2 * sx + 2 * sy + 4 * arc
    const H = sx / per
    const A = arc / per
    const V = sy / per
    ring = {
      xs: [a, w - a, w - a, w - a, w - a, a, a, a, a],
      ys: [a, a, a, h - a, h - a, h - a, h - a, a, a],
      at: [0, H, H + A, H + A + V, H + 2 * A + V, 2 * H + 2 * A + V, 2 * H + 3 * A + V, 2 * H + 3 * A + 2 * V, 1],
    }
    glow.classList.add('is-on')
    start()
  }

  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = Boolean(entry?.isIntersecting)
    start()
  })
  intersection.observe(pill)
  const resize = new ResizeObserver(measure) // fires once on observe
  resize.observe(pill)

  return () => {
    cancelAnimationFrame(raf)
    intersection.disconnect()
    resize.disconnect()
  }
}
