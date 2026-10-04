import { flushSync } from 'react-dom'

let updatingView = false
let activeTransition: ViewTransition | undefined
let originalRootName = ''
let pointerPressed = false
let listening = false

/** The shared 200ms root crossfade, styled in MakeApp.css. */
export function transitionView(update: () => void) {
  // Navigation can join a sidebar update without starting a second crossfade.
  if (updatingView) { update(); return }
  const swap = () => {
    updatingView = true
    try { flushSync(update) } finally { updatingView = false }
  }
  if (!listening) {
    listening = true
    // Even the brief snapshot-capture phase must not split a down/up gesture.
    document.addEventListener('pointerdown', () => { pointerPressed = true; activeTransition?.skipTransition() }, true)
    document.addEventListener('pointerup', () => { pointerPressed = false }, true)
    document.addEventListener('pointercancel', () => { pointerPressed = false }, true)
    window.addEventListener('blur', () => { pointerPressed = false })
    document.addEventListener('pointermove', event => { if (!event.buttons) pointerPressed = false }, true)
  }
  if (document.startViewTransition && !pointerPressed) {
    const root = document.documentElement
    if (!activeTransition) originalRootName = root.style.viewTransitionName
    root.style.viewTransitionName = 'root'
    const transition = document.startViewTransition(() => {
      // Fade the old snapshot over the LIVE new screen. Capturing the new root
      // would remove its descendants from hit-testing for the entire animation,
      // swallowing fast clicks and double-clicks even with pointer-events:none.
      root.style.viewTransitionName = 'none'
      swap()
    })
    activeTransition = transition
    const restore = () => {
      if (activeTransition !== transition) return
      root.style.viewTransitionName = originalRootName
      activeTransition = undefined
    }
    void transition.finished.then(restore, restore)
    // Superseded animations may be skipped; their state updates still run.
    void transition.ready.catch(() => {})
  }
  else swap()
}
