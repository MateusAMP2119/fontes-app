import { describe, expect, it } from 'vitest'
import {
  createInkItem,
  createItem,
  fitCamera,
  inkPath,
  itemsBounds,
  moveItem,
} from './items'

describe('createItem', () => {
  it('centers the item on the given point', () => {
    const item = createItem('sticky', { x: 100, y: 50 })
    expect(item.x + item.w / 2).toBe(100)
    expect(item.y + item.h / 2).toBe(50)
  })

  it('gives every item a unique id', () => {
    const a = createItem('text', { x: 0, y: 0 })
    const b = createItem('text', { x: 0, y: 0 })
    expect(a.id).not.toBe(b.id)
  })
})

describe('createInkItem', () => {
  it('normalizes points relative to the bounding box origin', () => {
    const ink = createInkItem([
      { x: 10, y: 20 },
      { x: 30, y: 60 },
    ])
    expect(ink.x).toBe(10)
    expect(ink.y).toBe(20)
    expect(ink.w).toBe(20)
    expect(ink.h).toBe(40)
    expect(ink.points[0]).toEqual({ x: 0, y: 0 })
    expect(ink.points[1]).toEqual({ x: 20, y: 40 })
  })
})

describe('moveItem', () => {
  it('translates without touching size', () => {
    const item = moveItem(createItem('note', { x: 0, y: 0 }), 15, -5)
    expect(item.w).toBe(260)
    expect(item.x).toBe(-130 + 15)
    expect(item.y).toBe(-100 - 5)
  })
})

describe('itemsBounds', () => {
  it('returns null for empty', () => {
    expect(itemsBounds([])).toBeNull()
  })

  it('unions all item rects', () => {
    const a = { ...createItem('text', { x: 0, y: 0 }), x: 0, y: 0, w: 10, h: 10 }
    const b = { ...createItem('text', { x: 0, y: 0 }), x: 90, y: 40, w: 10, h: 10 }
    expect(itemsBounds([a, b])).toEqual({ x: 0, y: 0, w: 100, h: 50 })
  })
})

describe('fitCamera', () => {
  it('centers bounds in the viewport', () => {
    const cam = fitCamera(
      { x: 0, y: 0, w: 100, h: 100 },
      { width: 1000, height: 800 },
      100,
    )
    // world center (50,50) should land at viewport center (500,400)
    expect(50 * cam.zoom + cam.x).toBeCloseTo(500)
    expect(50 * cam.zoom + cam.y).toBeCloseTo(400)
  })

  it('never zooms past 150%', () => {
    const cam = fitCamera({ x: 0, y: 0, w: 10, h: 10 }, { width: 1000, height: 800 })
    expect(cam.zoom).toBe(1.5)
  })
})

describe('inkPath', () => {
  it('builds an M/L path', () => {
    expect(inkPath([{ x: 0, y: 0 }, { x: 5, y: 5 }])).toBe('M 0 0 L 5 5')
  })
})
