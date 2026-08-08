import type { VizItem } from '../../../items/items'

export type Variant = 'default' | 'horizontal' | 'detail'

export type Thresholds = { minAspect: number; minW: number; detailMinH: number }

/** Derives the render variant from the card's own shape; nothing is persisted. */
export function variantFor(item: VizItem, t: Thresholds): Variant {
  if (item.w / item.h >= t.minAspect && item.w >= t.minW) return 'horizontal'
  return item.h >= t.detailMinH ? 'detail' : 'default'
}

/** A horizontal card with real height carries body copy too. */
export function hasCopy(item: VizItem, variant: Variant): boolean {
  return variant === 'detail' || (variant === 'horizontal' && item.h >= 150)
}
