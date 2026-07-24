/**
 * Pure camera/world transform helpers for the Fontes canvas.
 *
 * Mapping: screen = world * zoom + (x, y)
 * CSS on the world stage: translate(x, y) scale(zoom) with transform-origin 0 0.
 */

export type Camera = {
  /** Stage translation in screen pixels (after scale origin at 0,0). */
  x: number
  y: number
  /** Uniform scale factor (> 0). */
  zoom: number
}

export type Point = {
  x: number
  y: number
}

export const DEFAULT_CAMERA: Camera = {
  x: 0,
  y: 0,
  zoom: 1,
}

export const MIN_ZOOM = 0.1 // 10%
export const MAX_ZOOM = 4 // 400%

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Shift the camera by a screen-space pan delta. */
export function applyPan(camera: Camera, dx: number, dy: number): Camera {
  return {
    x: camera.x + dx,
    y: camera.y + dy,
    zoom: camera.zoom,
  }
}

/**
 * Zoom by `factor` (e.g. 1.1 = 10% in) while keeping the world point under
 * `point` (viewport/screen coords relative to the stage origin) fixed.
 */
export function applyZoomAtPoint(
  camera: Camera,
  factor: number,
  point: Point,
  limits: { min?: number; max?: number } = {},
): Camera {
  const min = limits.min ?? MIN_ZOOM
  const max = limits.max ?? MAX_ZOOM
  const nextZoom = clamp(camera.zoom * factor, min, max)

  if (nextZoom === camera.zoom) {
    return camera
  }

  const ratio = nextZoom / camera.zoom
  return {
    x: point.x - (point.x - camera.x) * ratio,
    y: point.y - (point.y - camera.y) * ratio,
    zoom: nextZoom,
  }
}

/** CSS transform string for the world stage (origin top-left). */
export function cameraToCssTransform(camera: Camera): string {
  return `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`
}

/** Convert a screen point (viewport-local) to world coordinates. */
export function screenToWorld(camera: Camera, screen: Point): Point {
  return {
    x: (screen.x - camera.x) / camera.zoom,
    y: (screen.y - camera.y) / camera.zoom,
  }
}
