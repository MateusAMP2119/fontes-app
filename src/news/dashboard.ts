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
export function recipe(event: NewsEvent, frame: Bounds): Slot[] {
  if (frame.w < COMPACT_BELOW) return compactRecipe(event)
  return [
    { kind: 'header', metric: 'summary', title: event.title, span: 12, rows: 2 },
    { kind: 'stat', metric: 'articles', title: 'Articles', span: 3, rows: 1.4 },
    { kind: 'stat', metric: 'outlets', title: 'Outlets', span: 3, rows: 1.4 },
    { kind: 'stat', metric: 'peak', title: 'Peak day', span: 3, rows: 1.4 },
    { kind: 'stat', metric: 'tone', title: 'Tone', span: 3, rows: 1.4 },
    { kind: 'area', metric: 'volume', title: 'Coverage over time', span: 8, rows: 3 },
    { kind: 'donut', metric: 'angles', title: 'Story threads', span: 4, rows: 3 },
    { kind: 'bar', metric: 'sources', title: 'Top outlets', span: 5, rows: 3 },
    { kind: 'headlines', metric: 'headlines', title: 'Latest headlines', span: 7, rows: 3 },
  ]
}

/** Four shelves: the story, two numbers, the shape of it, the reporting. */
function compactRecipe(event: NewsEvent): Slot[] {
  return [
    { kind: 'header', metric: 'summary', title: event.title, span: 12, rows: 2.4 },
    { kind: 'stat', metric: 'articles', title: 'Articles', span: 6, rows: 1.4 },
    { kind: 'stat', metric: 'outlets', title: 'Outlets', span: 6, rows: 1.4 },
    { kind: 'area', metric: 'volume', title: 'Coverage over time', span: 12, rows: 3 },
    { kind: 'headlines', metric: 'headlines', title: 'Latest headlines', span: 12, rows: 2.4 },
  ]
}

export function buildDashboard(event: NewsEvent, frame: Bounds): VizItem[] {
  return layout(recipe(event, frame), frame).map(({ x, y, w, h, kind, title, metric }) =>
    createVizItem({ kind, title, metric, eventId: event.id }, { x, y, w, h }),
  )
}
