/**
 * Shelf-packs a dashboard recipe into the PC frame.
 *
 * Runs once, at pick time. The output is ordinary freeform items, so there is
 * deliberately no re-layout on resize — it would clobber the user's drags, and
 * the app has no undo.
 */

import { clamp } from '../camera/camera'
import type { Bounds, VizKind, VizMetric } from '../items/items'

export type Slot = {
  kind: VizKind
  metric: VizMetric
  title: string
  /** Columns out of 12. */
  span: number
  /** Row units tall — sets the shelf height. */
  rows: number
}

const GRID = {
  pad: 22,
  gutter: 14,
  wideCols: 12,
  narrowCols: 6,
  /** Inner width below this collapses to 6 columns. */
  wideAt: 760,
  minRowH: 48,
  maxRowH: 112,
} as const

export function layout(slots: Slot[], frame: Bounds): (Slot & Bounds)[] {
  const { pad, gutter } = GRID
  const innerX = frame.x + pad
  const innerY = frame.y + pad
  const innerW = Math.max(frame.w - pad * 2, 260)
  const innerH = Math.max(frame.h - pad * 2, 260)

  const wide = innerW >= GRID.wideAt
  const cols = wide ? GRID.wideCols : GRID.narrowCols
  const colW = (innerW - gutter * (cols - 1)) / cols

  // 1 — fill a row of columns, wrap when the next slot will not fit.
  type Shelf = { placed: { slot: Slot; col: number }[]; rows: number }
  const shelves: Shelf[] = []
  let shelf: Shelf = { placed: [], rows: 0 }
  let col = 0
  for (const slot of slots) {
    const span = spanFor(slot, wide)
    if (col + span > cols && shelf.placed.length > 0) {
      shelves.push(shelf)
      shelf = { placed: [], rows: 0 }
      col = 0
    }
    shelf.placed.push({ slot, col })
    shelf.rows = Math.max(shelf.rows, slot.rows)
    col += span
  }
  if (shelf.placed.length > 0) shelves.push(shelf)

  // 2 — solve one row height so the whole recipe fills the frame vertically.
  const totalRows = shelves.reduce((n, s) => n + s.rows, 0)
  const avail = innerH - gutter * (shelves.length - 1)
  const rowH = clamp(avail / totalRows, GRID.minRowH, GRID.maxRowH)

  // 3 — place. Everything in a shelf takes the shelf height, so bottoms align.
  const out: (Slot & Bounds)[] = []
  let y = innerY
  for (const s of shelves) {
    const h = s.rows * rowH
    for (const { slot, col: c } of s.placed) {
      const span = spanFor(slot, wide)
      out.push({
        ...slot,
        x: Math.round(innerX + c * (colW + gutter)),
        y: Math.round(y),
        w: Math.round(span * colW + (span - 1) * gutter),
        h: Math.round(h),
      })
    }
    y += h + gutter
  }
  return out
}

/** At 6 columns, wide slots go full width and narrow slots pair up. */
function spanFor(slot: Slot, wide: boolean): number {
  if (wide) return Math.min(slot.span, GRID.wideCols)
  return slot.span >= 7 ? GRID.narrowCols : 3
}
