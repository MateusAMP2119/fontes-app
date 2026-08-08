/**
 * The dashboard's 12-column grid: geometry (cells ↔ pixels) plus the
 * collision engine that keeps cards from overlapping — push colliders down,
 * let everything else float up.
 *
 * Pure functions over plain data, no DOM: `GridMetrics` carries everything
 * measured from the frame, so callers own the measuring.
 */

import { clamp } from '../camera/camera'
import type { Bounds, GridPos } from '../items/items'

export type GridEntry = GridPos & { id: string }

export type GridMetrics = {
  originX: number
  originY: number
  colW: number
  rowH: number
  gutter: number
  cols: number
}

export const GRID = {
  pad: 22,
  gutter: 14,
  cols: 12,
  /**
   * Row-height solve range. Narrower than the old fractional-row range
   * (48–112) because rows are now integers: a card that was 1.7 rows tall is
   * 2 rows plus a gutter, so the same card height needs a smaller row unit.
   */
  minRowH: 32,
  maxRowH: 96,
  /** One column is ~70px in a typical frame — too small for any widget. */
  minColSpan: 2,
  minRowSpan: 1,
} as const

/**
 * The size vocabulary: every card resizes to one of these span pairs, so the
 * dashboard speaks a handful of shared sizes instead of arbitrary spans.
 */
export const SIZE_PRESETS: readonly { colSpan: number; rowSpan: number }[] = [
  { colSpan: 3, rowSpan: 2 }, // S — KPI
  { colSpan: 4, rowSpan: 2 }, // M — small chart
  { colSpan: 6, rowSpan: 2 }, // W — wide chart
  { colSpan: 12, rowSpan: 2 }, // F — full-width strip
  { colSpan: 4, rowSpan: 4 }, // T — tall panel
  { colSpan: 8, rowSpan: 4 }, // L — hero
]

/** Pixel size of a span: n units plus the n-1 gutters between them. */
const spanPx = (span: number, unit: number, gutter: number) =>
  span * unit + (span - 1) * gutter

/**
 * The preset closest (L1 pixel distance) to a requested size, considering
 * only presets that fit the available spans.
 */
export function nearestPreset(
  w: number,
  h: number,
  m: GridMetrics,
  maxColSpan: number,
  maxRowSpan: number,
): { colSpan: number; rowSpan: number } {
  const fits = SIZE_PRESETS.filter(
    (p) => p.colSpan <= maxColSpan && p.rowSpan <= maxRowSpan,
  )
  // ponytail: nothing fits near the frame edge — fall back to all presets
  // and let applyResize clamp the spans.
  const pool = fits.length > 0 ? fits : SIZE_PRESETS
  let best = pool[0]
  let bestDist = Infinity
  for (const p of pool) {
    const dist =
      Math.abs(w - spanPx(p.colSpan, m.colW, m.gutter)) +
      Math.abs(h - spanPx(p.rowSpan, m.rowH, m.gutter))
    if (dist < bestDist) {
      best = p
      bestDist = dist
    }
  }
  return best
}

const innerW = (frame: Bounds) => Math.max(frame.w - GRID.pad * 2, 260)
const innerH = (frame: Bounds) => Math.max(frame.h - GRID.pad * 2, 260)

/** One row height so `totalRows` rows (plus gutters) fill the frame. */
export function solveRowH(frame: Bounds, totalRows: number): number {
  const avail = innerH(frame) - GRID.gutter * (totalRows - 1)
  return clamp(avail / totalRows, GRID.minRowH, GRID.maxRowH)
}

export function gridMetrics(frame: Bounds, rowH: number): GridMetrics {
  return {
    originX: frame.x + GRID.pad,
    originY: frame.y + GRID.pad,
    colW: (innerW(frame) - GRID.gutter * (GRID.cols - 1)) / GRID.cols,
    rowH,
    gutter: GRID.gutter,
    cols: GRID.cols,
  }
}

/** Whole rows that fit inside the frame — the drag/resize clamp target. */
export function maxRows(frame: Bounds, m: GridMetrics): number {
  return Math.max(1, Math.floor((innerH(frame) + m.gutter) / (m.rowH + m.gutter)))
}

/** colW is fractional; round only here so edges land on device pixels. */
export function gridToPx(pos: GridPos, m: GridMetrics): Bounds {
  return {
    x: Math.round(m.originX + pos.col * (m.colW + m.gutter)),
    y: Math.round(m.originY + pos.row * (m.rowH + m.gutter)),
    w: Math.round(pos.colSpan * m.colW + (pos.colSpan - 1) * m.gutter),
    h: Math.round(pos.rowSpan * m.rowH + (pos.rowSpan - 1) * m.gutter),
  }
}

/** Nearest cell to a top-left pixel corner. */
export function pxToCell(x: number, y: number, m: GridMetrics): { col: number; row: number } {
  return {
    col: Math.max(0, Math.round((x - m.originX) / (m.colW + m.gutter))),
    row: Math.max(0, Math.round((y - m.originY) / (m.rowH + m.gutter))),
  }
}

/** Nearest span for a pixel size; a span of n covers n units and n-1 gutters. */
export function pxToSpans(w: number, h: number, m: GridMetrics): { colSpan: number; rowSpan: number } {
  return {
    colSpan: Math.max(GRID.minColSpan, Math.round((w + m.gutter) / (m.colW + m.gutter))),
    rowSpan: Math.max(GRID.minRowSpan, Math.round((h + m.gutter) / (m.rowH + m.gutter))),
  }
}

export function collides(a: GridPos, b: GridPos): boolean {
  return (
    a.col < b.col + b.colSpan &&
    a.col + a.colSpan > b.col &&
    a.row < b.row + b.rowSpan &&
    a.row + a.rowSpan > b.row
  )
}

const byPosition = (a: GridEntry, b: GridEntry) => a.row - b.row || a.col - b.col

/**
 * Settle the layout: every entry floats up until it hits something, and
 * anything overlapping an already-settled entry is pushed down past it. The
 * pinned entry (the card being dragged/resized) settles first and never
 * moves, so colliders flow around it — this one pass is both the push and
 * the vertical compaction. Idempotent on an already-settled layout.
 */
export function compact(entries: GridEntry[], pinnedId?: string): GridEntry[] {
  const sorted = [...entries].sort(byPosition)
  const pinned = pinnedId != null ? sorted.find((e) => e.id === pinnedId) : undefined
  const placed: GridEntry[] = pinned ? [pinned] : []
  for (const entry of sorted) {
    if (entry === pinned) continue
    let e = entry
    const hits = (cand: GridPos) => placed.some((p) => collides(cand, p))
    while (e.row > 0 && !hits({ ...e, row: e.row - 1 })) e = { ...e, row: e.row - 1 }
    // Displaced by the pinned card? It may jump into any room above it —
    // this is what makes dragging a card *down* swap with its neighbor
    // instead of springing back (row-by-row floating cannot pass the
    // pinned card, so without the jump the old layout always re-forms).
    if (pinned && hits(e) && collides(e, pinned)) {
      for (let row = 0; row < e.row; row += 1) {
        if (!hits({ ...e, row })) {
          e = { ...e, row }
          break
        }
      }
    }
    while (hits(e)) e = { ...e, row: e.row + 1 }
    placed.push(e)
  }
  // Preserve the caller's entry order so layouts map back to items by index.
  return entries.map((orig) => placed.find((p) => p.id === orig.id) as GridEntry)
}

/** Move one card to a cell; colliders are pushed aside, the rest compacts. */
export function applyMove(entries: GridEntry[], id: string, col: number, row: number): GridEntry[] {
  const target = entries.find((e) => e.id === id)
  if (!target) return entries
  const c = clamp(col, 0, GRID.cols - target.colSpan)
  const r = Math.max(0, row)
  return compact(
    entries.map((e) => (e.id === id ? { ...e, col: c, row: r } : e)),
    id,
  )
}

/** Resize one card in place; neighbors reflow the same way a move does. */
export function applyResize(
  entries: GridEntry[],
  id: string,
  colSpan: number,
  rowSpan: number,
): GridEntry[] {
  const target = entries.find((e) => e.id === id)
  if (!target) return entries
  const cs = clamp(colSpan, GRID.minColSpan, GRID.cols - target.col)
  const rs = Math.max(GRID.minRowSpan, rowSpan)
  return compact(
    entries.map((e) => (e.id === id ? { ...e, colSpan: cs, rowSpan: rs } : e)),
    id,
  )
}

/**
 * Fit freeform pixel rects onto the grid — the one-time adoption path for
 * boards saved before grid coordinates existed. Nearest-cell fit, then a
 * settle pass to resolve any overlaps the rounding created.
 */
export function adopt(rects: (Bounds & { id: string })[], m: GridMetrics): GridEntry[] {
  const fitted = rects.map(({ id, x, y, w, h }) => {
    const spans = pxToSpans(w, h, m)
    const colSpan = Math.min(spans.colSpan, GRID.cols)
    const cell = pxToCell(x, y, m)
    return {
      id,
      col: clamp(cell.col, 0, GRID.cols - colSpan),
      row: cell.row,
      colSpan,
      rowSpan: spans.rowSpan,
    }
  })
  return compact(fitted)
}
