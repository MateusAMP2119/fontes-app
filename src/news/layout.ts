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
  /**
   * Spans this shelf and the next: the slot's columns are reserved in the
   * following shelf and its height covers both shelves plus the gutter.
   */
  shelves?: 2
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

  // 1 — fill a row of columns, wrap when the next slot will not fit. A slot
  // marked `shelves: 2` reserves its column range in the following shelf.
  type Shelf = { placed: { slot: Slot; col: number }[]; rows: number }
  const shelves: Shelf[] = []
  let reserved: { from: number; to: number }[] = []
  let nextReserved: { from: number; to: number }[] = []
  let shelf: Shelf = { placed: [], rows: 0 }
  let col = 0
  const skipReserved = (c: number, span: number): number => {
    let at = c
    for (const r of reserved) {
      if (at < r.to && at + span > r.from) at = r.to
    }
    return at
  }
  for (const slot of slots) {
    const span = spanFor(slot, wide)
    let at = skipReserved(col, span)
    if (at + span > cols && shelf.placed.length > 0) {
      shelves.push(shelf)
      shelf = { placed: [], rows: 0 }
      reserved = nextReserved
      nextReserved = []
      at = skipReserved(0, span)
    }
    shelf.placed.push({ slot, col: at })
    shelf.rows = Math.max(shelf.rows, slot.rows)
    if (slot.shelves === 2 && wide) nextReserved.push({ from: at, to: at + span })
    col = at + span
  }
  if (shelf.placed.length > 0) shelves.push(shelf)

  // 2 — solve one row height so the whole recipe fills the frame vertically.
  const totalRows = shelves.reduce((n, s) => n + s.rows, 0)
  const avail = innerH - gutter * (shelves.length - 1)
  const rowH = clamp(avail / totalRows, GRID.minRowH, GRID.maxRowH)

  // 3 — place. Everything in a shelf takes the shelf height, so bottoms
  // align; a two-shelf slot additionally absorbs the next shelf and gutter.
  const out: (Slot & Bounds)[] = []
  let y = innerY
  for (let si = 0; si < shelves.length; si += 1) {
    const s = shelves[si]
    const h = s.rows * rowH
    for (const { slot, col: c } of s.placed) {
      const span = spanFor(slot, wide)
      const next = shelves[si + 1]
      const tall = slot.shelves === 2 && wide && next
      out.push({
        ...slot,
        x: Math.round(innerX + c * (colW + gutter)),
        y: Math.round(y),
        w: Math.round(span * colW + (span - 1) * gutter),
        h: Math.round(tall ? h + gutter + next.rows * rowH : h),
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
