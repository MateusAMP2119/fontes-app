/** Turns a picked event into a board's worth of widgets. */

import { createVizItem, type Bounds, type VizItem } from '../items/items'
import type { NewsEvent } from './events'
import { gridMetrics, gridToPx, solveRowH } from './grid'
import { layout, type Slot } from './layout'

/**
 * Below this frame width the full recipe packs taller than the row-height
 * floor can fit, and the board does not scroll. Build fewer, readable
 * widgets instead.
 */
const COMPACT_BELOW = 560

/**
 * Spans sum to 12 per shelf, so no row ends ragged. Rows are whole grid
 * units — a chart shelf is 2 rows, the tall reporting widgets are 4.
 */
export function recipe(frame: Bounds): Slot[] {
  if (frame.w < COMPACT_BELOW) return compactRecipe()
  return [
    { kind: 'kpi', metric: 'events', title: 'Eventos publicados', span: 4, rows: 2 },
    { kind: 'evolution', metric: 'evolution', title: 'Evolução de art. e ev.', span: 3, rows: 2 },
    { kind: 'kpi', metric: 'reach', title: 'Alcance estimado', span: 3, rows: 2 },
    { kind: 'coverage', metric: 'coverage', title: 'Cobertura por fonte', span: 2, rows: 2, shelves: 2 },
    { kind: 'kpi', metric: 'sources', title: 'Fontes ativas', span: 3, rows: 2 },
    { kind: 'sentiment', metric: 'sentiment', title: 'Análise de sentimentos', span: 7, rows: 2 },
    { kind: 'narratives', metric: 'narratives', title: 'Principais narrativas', span: 8, rows: 4 },
  ]
}

/** Four shelves: the numbers, the split, the mood, the reporting. */
function compactRecipe(): Slot[] {
  return [
    { kind: 'kpi', metric: 'events', title: 'Eventos publicados', span: 12, rows: 2 },
    { kind: 'kpi', metric: 'reach', title: 'Alcance estimado', span: 6, rows: 2 },
    { kind: 'kpi', metric: 'sources', title: 'Fontes ativas', span: 6, rows: 2 },
    { kind: 'sentiment', metric: 'sentiment', title: 'Análise de sentimentos', span: 12, rows: 2 },
    { kind: 'narratives', metric: 'narratives', title: 'Principais narrativas', span: 12, rows: 3 },
  ]
}

/** Rows the main recipe occupies — the default row-height solve target. */
export const DEFAULT_TOTAL_ROWS = 8

export function buildDashboard(
  event: NewsEvent,
  frame: Bounds,
): { items: VizItem[]; rowH: number } {
  const placed = layout(recipe(frame))
  const totalRows = placed.reduce((n, p) => Math.max(n, p.row + p.rowSpan), 1)
  const rowH = solveRowH(frame, totalRows)
  const m = gridMetrics(frame, rowH)
  const items = placed.map(({ col, row, colSpan, rowSpan, kind, title, metric }) => {
    const grid = { col, row, colSpan, rowSpan }
    return createVizItem({ kind, title, metric, eventId: event.id }, gridToPx(grid, m), grid)
  })
  return { items, rowH }
}
