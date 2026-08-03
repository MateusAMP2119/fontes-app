/** Where the PC frame sits, in item coordinates. */

import type { Bounds } from '../items/items'

/** Mirrors the .device-frames `inset` in App.css — fallback path only. */
const FRAME_INSET = { top: 2, right: 14, bottom: 6, left: 15 } as const

/**
 * The PC frame's box relative to .stage-viewport, which is the origin items
 * are positioned against.
 *
 * Uses offsetLeft/offsetWidth rather than getBoundingClientRect: .frame-pc
 * lives inside the board cross-fade motion.div, which animates `scale`.
 * Client rects are post-transform while item coordinates are pre-transform,
 * and subtracting the viewport rect does not cancel it — the delta is itself
 * scaled about the stage center. Offset boxes are layout-space, so they stay
 * correct even mid-transition.
 */
export function measureFrame(
  frame: HTMLElement | null,
  content: HTMLElement | null,
): Bounds {
  if (frame) {
    // .frame-pc's offsetParent is .device-frames, whose own offsetParent is
    // .stage-viewport — one hop to get back to the item origin.
    const frames = frame.offsetParent as HTMLElement | null
    return {
      x: frame.offsetLeft + (frames?.offsetLeft ?? 0),
      y: frame.offsetTop + (frames?.offsetTop ?? 0),
      w: frame.offsetWidth,
      h: frame.offsetHeight,
    }
  }

  // Ref not attached yet — derive from .board-content, which is never scaled.
  const rect = content?.getBoundingClientRect()
  const w = rect?.width ?? window.innerWidth
  const h = rect?.height ?? window.innerHeight
  return {
    x: FRAME_INSET.left,
    y: FRAME_INSET.top,
    w: w - FRAME_INSET.left - FRAME_INSET.right,
    h: h - FRAME_INSET.top - FRAME_INSET.bottom,
  }
}
