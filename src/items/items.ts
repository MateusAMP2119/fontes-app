/** Item model. Ink stroke points are relative to the item origin. */

import {
  clamp,
  MAX_ZOOM,
  MIN_ZOOM,
  type Camera,
  type Point,
} from '../camera/camera'

export type ItemType = 'text' | 'sticky' | 'note' | 'table' | 'ink'

export type BaseItem = {
  id: string
  type: ItemType
  x: number
  y: number
  w: number
  h: number
}

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

export type Item = TextItem | StickyItem | NoteItem | TableItem | InkItem

export const STICKY_COLORS = ['#ffe066', '#ffd6e0', '#c3f0ca', '#cde6ff', '#e6d9ff']

let idCounter = 0

/** Monotonic unique id; survives fast successive calls unlike Date-based ids. */
export function nextItemId(): string {
  idCounter += 1
  return `item-${idCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/** Create a default item of `type` centered on the world point `at`. */
export function createItem(type: Exclude<ItemType, 'ink'>, at: Point, seed = 0): Item {
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

/** Camera that fits `bounds` inside `viewport` with `padding` screen px. */
export function fitCamera(
  bounds: Bounds,
  viewport: { width: number; height: number },
  padding = 80,
): Camera {
  const availW = Math.max(viewport.width - padding * 2, 1)
  const availH = Math.max(viewport.height - padding * 2, 1)
  const zoom = clamp(Math.min(availW / bounds.w, availH / bounds.h, 1.5), MIN_ZOOM, MAX_ZOOM)
  return {
    zoom,
    x: viewport.width / 2 - (bounds.x + bounds.w / 2) * zoom,
    y: viewport.height / 2 - (bounds.y + bounds.h / 2) * zoom,
  }
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
