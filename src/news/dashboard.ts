/** Turns a picked event into a board's worth of widgets. */

import { createVizItem, type Bounds, type VizItem } from '../items/items'
import type { NewsEvent } from './events'
import { layout, type Slot } from './layout'

/**
 * Below this frame width the layout is down to 6 columns, so the full recipe
 * needs seven shelves — more than the row-height floor can fit, and the board
 * does not scroll. Build fewer, readable widgets instead.
 */
const COMPACT_BELOW = 560

/**
 * Spans sum to 12 per shelf, so no row ends ragged. Row units are fractional
 * because a chart reads fine at a third of its shelf while the header and
 * stat cards have a floor set by their type sizes.
 */
export function recipe(frame: Bounds): Slot[] {
  if (frame.w < COMPACT_BELOW) return compactRecipe()
  return [
    { kind: 'kpi', metric: 'events', title: 'Eventos publicados', span: 4, rows: 1.7 },
    { kind: 'evolution', metric: 'evolution', title: 'Evolução de art. e ev.', span: 3, rows: 1.7 },
    { kind: 'kpi', metric: 'reach', title: 'Alcance estimado', span: 3, rows: 1.7 },
    { kind: 'coverage', metric: 'coverage', title: 'Cobertura por fonte', span: 2, rows: 1.7, shelves: 2 },
    { kind: 'kpi', metric: 'sources', title: 'Fontes ativas', span: 3, rows: 1.7 },
    { kind: 'sentiment', metric: 'sentiment', title: 'Análise de sentimentos', span: 7, rows: 1.7 },
    { kind: 'narratives', metric: 'narratives', title: 'Principais narrativas', span: 8, rows: 3.4 },
  ]
}

/** Four shelves: the numbers, the split, the mood, the reporting. */
function compactRecipe(): Slot[] {
  return [
    { kind: 'kpi', metric: 'events', title: 'Eventos publicados', span: 12, rows: 1.6 },
    { kind: 'kpi', metric: 'reach', title: 'Alcance estimado', span: 6, rows: 1.6 },
    { kind: 'kpi', metric: 'sources', title: 'Fontes ativas', span: 6, rows: 1.6 },
    { kind: 'sentiment', metric: 'sentiment', title: 'Análise de sentimentos', span: 12, rows: 1.8 },
    { kind: 'narratives', metric: 'narratives', title: 'Principais narrativas', span: 12, rows: 2.6 },
  ]
}

export function buildDashboard(event: NewsEvent, frame: Bounds): VizItem[] {
  return layout(recipe(frame), frame).map(({ x, y, w, h, kind, title, metric }) =>
    createVizItem({ kind, title, metric, eventId: event.id }, { x, y, w, h }),
  )
}
