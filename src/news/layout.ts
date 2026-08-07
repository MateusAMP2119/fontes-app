/**
 * Shelf-packs a dashboard recipe onto the 12-column grid.
 *
 * Runs once, at pick time. The output is grid coordinates — geometry
 * (cells → pixels, row-height solve) lives in grid.ts, and after placement
 * the cards belong to the interactive grid engine there.
 */

import type { GridPos, VizKind, VizMetric } from '../items/items'
import { GRID } from './grid'

export type Slot = {
  kind: VizKind
  metric: VizMetric
  title: string
  /** Columns out of 12. */
  span: number
  /** Whole grid rows tall — sets the shelf height. */
  rows: number
  /**
   * Spans this shelf and the next: the slot's columns are reserved in the
   * following shelf and its height covers both shelves plus the gutter.
   */
  shelves?: 2
}

export function layout(slots: Slot[]): (Slot & GridPos)[] {
  const cols = GRID.cols

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
    const span = Math.min(slot.span, cols)
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
    if (slot.shelves === 2) nextReserved.push({ from: at, to: at + span })
    col = at + span
  }
  if (shelf.placed.length > 0) shelves.push(shelf)

  // 2 — place. Everything in a shelf takes the shelf height, so bottoms
  // align; a two-shelf slot additionally absorbs the next shelf (the gutter
  // between rows comes with the extra rows in grid space).
  const out: (Slot & GridPos)[] = []
  let row = 0
  for (let si = 0; si < shelves.length; si += 1) {
    const s = shelves[si]
    for (const { slot, col: c } of s.placed) {
      const next = shelves[si + 1]
      const tall = slot.shelves === 2 && next
      out.push({
        ...slot,
        col: c,
        row,
        colSpan: Math.min(slot.span, cols),
        rowSpan: tall ? s.rows + next.rows : s.rows,
      })
    }
    row += s.rows
  }
  return out
}
