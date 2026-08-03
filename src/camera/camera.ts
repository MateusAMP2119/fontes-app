/**
 * Geometry primitives shared by the board.
 *
 * This was the camera module back when the board panned and zoomed. The board
 * is fixed now (see Canvas), so the transform helpers are gone and only the
 * two pieces everything else still uses remain.
 */

export type Point = {
  x: number
  y: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
