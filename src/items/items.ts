/** Item model. Ink stroke points are relative to the item origin. */

import type { Point } from '../camera/camera'

export type ItemType = 'text' | 'sticky' | 'note' | 'table' | 'viz' | 'ink'

/**
 * Types the toolbar can insert. Ink comes from strokes, viz from a topic.
 *
 * Keep this narrowing: tsconfig has no `strict`, so passing 'viz' to
 * createItem would fall out of the switch and return undefined — assignable
 * to Item without strictNullChecks, and a runtime-only failure.
 */
export type InsertableType = Exclude<ItemType, 'ink' | 'viz'>

export type BaseItem = {
  id: string
  type: ItemType
  x: number
  y: number
  w: number
  h: number
}

/**
 * Cell position and span on the dashboard's 12-column grid. Lives here
 * rather than in news/grid.ts because VizItem carries one and the grid
 * module already depends on this file for Bounds.
 */
export type GridPos = { col: number; row: number; colSpan: number; rowSpan: number }

export type TextItem = BaseItem & { type: 'text'; text: string }
export type StickyItem = BaseItem & { type: 'sticky'; text: string; color: string }
export type NoteItem = BaseItem & { type: 'note'; text: string }
export type TableItem = BaseItem & { type: 'table'; cells: string[][] }
export type InkItem = BaseItem & {
  type: 'ink'
  /** Points relative to (x, y). */
  points: Point[]
  color: string
  strokeWidth: number
}

export type VizKind = 'kpi' | 'sentiment' | 'evolution' | 'coverage' | 'entities' | 'narratives'

export type VizMetric =
  | 'events'
  | 'reach'
  | 'sources'
  | 'sentiment'
  | 'evolution'
  | 'coverage'
  | 'entities'
  | 'narratives'

/**
 * A dashboard widget. Holds no data of its own — `eventId` and `metric`
 * re-derive the series on every render, which is what keeps the numbers
 * stable across reloads without persisting them.
 */
export type VizItem = BaseItem & {
  type: 'viz'
  kind: VizKind
  title: string
  eventId: string
  metric: VizMetric
  /**
   * Authoritative position on the dashboard grid; x/y/w/h are derived from
   * it against the measured frame. Optional because boards saved before the
   * grid existed adopt one lazily, once a frame can be measured.
   */
  grid?: GridPos
}

export type Item = TextItem | StickyItem | NoteItem | TableItem | VizItem | InkItem

export const STICKY_COLORS = ['#ffe066', '#ffd6e0', '#c3f0ca', '#cde6ff', '#e6d9ff']

let idCounter = 0

/** Monotonic unique id; survives fast successive calls unlike Date-based ids. */
export function nextItemId(): string {
  idCounter += 1
  return `item-${idCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/** Create a default item of `type` centered on the world point `at`. */
export function createItem(type: InsertableType, at: Point, seed = 0): Item {
  const id = nextItemId()
  switch (type) {
    case 'text': {
      const w = 220
      const h = 44
      return { id, type, x: at.x - w / 2, y: at.y - h / 2, w, h, text: '' }
    }
    case 'sticky': {
      const w = 180
      const h = 180
      return {
        id,
        type,
        x: at.x - w / 2,
        y: at.y - h / 2,
        w,
        h,
        text: '',
        color: STICKY_COLORS[seed % STICKY_COLORS.length],
      }
    }
    case 'note': {
      const w = 260
      const h = 200
      return { id, type, x: at.x - w / 2, y: at.y - h / 2, w, h, text: '' }
    }
    case 'table': {
      const w = 360
      const h = 132
      return {
        id,
        type,
        x: at.x - w / 2,
        y: at.y - h / 2,
        w,
        h,
        cells: [
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
        ],
      }
    }
  }
}

/** Build an ink item from absolute world points; normalizes to relative. */
export function createInkItem(worldPoints: Point[], color = '#1d1d1f', strokeWidth = 3): InkItem {
  const xs = worldPoints.map((p) => p.x)
  const ys = worldPoints.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return {
    id: nextItemId(),
    type: 'ink',
    x: minX,
    y: minY,
    w: Math.max(maxX - minX, 1),
    h: Math.max(maxY - minY, 1),
    points: worldPoints.map((p) => ({ x: p.x - minX, y: p.y - minY })),
    color,
    strokeWidth,
  }
}

export type VizSpec = {
  kind: VizKind
  title: string
  eventId: string
  metric: VizMetric
}

/** Widgets are placed from a grid, so they take a box rather than a center. */
export function createVizItem(spec: VizSpec, at: Bounds, grid?: GridPos): VizItem {
  return { id: nextItemId(), type: 'viz', ...at, ...spec, grid }
}

export function moveItem<T extends Item>(item: T, dx: number, dy: number): T {
  return { ...item, x: item.x + dx, y: item.y + dy }
}

export type Bounds = { x: number; y: number; w: number; h: number }

/** Union bounding box of all items; null when empty. */
export function itemsBounds(items: Item[]): Bounds | null {
  if (items.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const it of items) {
    minX = Math.min(minX, it.x)
    minY = Math.min(minY, it.y)
    maxX = Math.max(maxX, it.x + it.w)
    maxY = Math.max(maxY, it.y + it.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** SVG path string for an ink item's (relative) points. */
export function inkPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const p = points[0]
    return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y}`
  }
  const [first, ...rest] = points
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(' ')
}
