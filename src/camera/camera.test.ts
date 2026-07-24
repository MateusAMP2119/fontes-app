import { describe, expect, it } from 'vitest'
import {
  applyPan,
  applyZoomAtPoint,
  cameraToCssTransform,
  clamp,
  DEFAULT_CAMERA,
  MAX_ZOOM,
  MIN_ZOOM,
  screenToWorld,
  type Camera,
} from './camera'

describe('clamp', () => {
  it('bounds a value to [min, max]', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(99, 0, 10)).toBe(10)
  })
})

describe('applyPan', () => {
  it('adds screen-space deltas without changing zoom', () => {
    const start: Camera = { x: 100, y: -40, zoom: 1.5 }
    const next = applyPan(start, 25.5, -10)

    expect(next).toEqual({ x: 125.5, y: -50, zoom: 1.5 })
    // pure: input unchanged
    expect(start).toEqual({ x: 100, y: -40, zoom: 1.5 })
  })

  it('supports chained pans from default camera', () => {
    const a = applyPan(DEFAULT_CAMERA, 200, 100)
    const b = applyPan(a, -50, 25)
    expect(b).toEqual({ x: 150, y: 125, zoom: 1 })
  })
})

describe('applyZoomAtPoint', () => {
  it('zooms toward a point and keeps that world point under the cursor', () => {
    const camera: Camera = { x: 80, y: 40, zoom: 1 }
    const pivot = { x: 200, y: 150 }
    const factor = 2

    const worldBefore = screenToWorld(camera, pivot)
    const next = applyZoomAtPoint(camera, factor, pivot)

    expect(next.zoom).toBe(2)
    // translation formula: t' = p - (p - t) * (z'/z)
    expect(next.x).toBeCloseTo(200 - (200 - 80) * 2, 10)
    expect(next.y).toBeCloseTo(150 - (150 - 40) * 2, 10)

    const worldAfter = screenToWorld(next, pivot)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 10)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 10)
  })

  it('zooms out toward a non-origin point with a fractional factor', () => {
    const camera: Camera = { x: -120, y: 60, zoom: 2 }
    const pivot = { x: 320, y: 180 }
    const factor = 0.5

    const worldBefore = screenToWorld(camera, pivot)
    const next = applyZoomAtPoint(camera, factor, pivot)

    expect(next.zoom).toBe(1)
    const worldAfter = screenToWorld(next, pivot)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 10)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 10)
  })

  it('clamps zoom to min and max and leaves camera unchanged at bounds', () => {
    const atMin: Camera = { x: 10, y: 20, zoom: MIN_ZOOM }
    expect(applyZoomAtPoint(atMin, 0.5, { x: 0, y: 0 })).toBe(atMin)

    const atMax: Camera = { x: 0, y: 0, zoom: MAX_ZOOM }
    expect(applyZoomAtPoint(atMax, 1.5, { x: 100, y: 100 })).toBe(atMax)

    const mid: Camera = { x: 0, y: 0, zoom: 1 }
    const clampedHigh = applyZoomAtPoint(mid, 100, { x: 50, y: 50 })
    expect(clampedHigh.zoom).toBe(MAX_ZOOM)

    const clampedLow = applyZoomAtPoint(mid, 0.001, { x: 50, y: 50 })
    expect(clampedLow.zoom).toBe(MIN_ZOOM)
  })

  it('accepts custom zoom limits', () => {
    const camera: Camera = { x: 0, y: 0, zoom: 1 }
    const next = applyZoomAtPoint(camera, 10, { x: 0, y: 0 }, { min: 0.5, max: 2 })
    expect(next.zoom).toBe(2)
  })
})

describe('cameraToCssTransform', () => {
  it('formats translate + scale for the world stage', () => {
    expect(cameraToCssTransform({ x: 12.5, y: -3, zoom: 1.25 })).toBe(
      'translate(12.5px, -3px) scale(1.25)',
    )
  })
})
