import type { VizItem } from '../../../items/items'
import type { WeekPoint } from '../../../news/series'
import s from './shared.module.css'

/** Card padding; charts derive their box from item.w/h minus these. */
export const PAD = 16
export const LABEL_H = 26

export function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/** True when copy fits a midW×availH box without clipping (rough type metrics). */
export function textFits(midW: number, availH: number, copy: string): boolean {
  if (midW < 150) return false
  return Math.ceil(copy.length / (midW / 6)) * 17 <= availH
}

/** Gray weekday columns, "hoje" in white; sparse labels from the end. */
export function MiniColumns({ item, points }: { item: VizItem; points: WeekPoint[] }) {
  const w = Math.min(Math.max(item.w * 0.42, 120), 220)
  const h = Math.max(item.h - PAD * 2 - LABEL_H - 14, 40)
  const max = Math.max(...points.map((p) => p.value))
  const gap = 6
  const barW = (w - gap * (points.length - 1)) / points.length
  return (
    <div className={s.minichart} style={{ width: w }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        {points.map((p, i) => {
          const bh = Math.max((p.value / max) * (h - 4), 3)
          return (
            <rect
              key={i}
              x={r2(i * (barW + gap))}
              y={r2(h - bh)}
              width={r2(barW)}
              height={r2(bh)}
              rx={1.5}
              fill={p.today ? 'var(--chart-fg)' : 'var(--chart-dim)'}
            />
          )
        })}
      </svg>
      <div className={s.minichartAxis}>
        {points.map((p, i) => (
          <span key={i} style={{ width: barW + (i < points.length - 1 ? gap : 0) }}>
            {(points.length - 1 - i) % 2 === 0 ? p.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
