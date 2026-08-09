import type { VizItem } from '../../../items/items'
import type { WeekPoint } from '../../../news/series'
import { Sparkline } from '../../Sparkline'
import s from './shared.module.css'

/** Card padding; charts derive their box from item.w/h minus these. */
export const PAD = 16
export const LABEL_H = 26
/** One spacing unit: card padding and the gap between layout columns. */
export const GUTTER = PAD

export function r2(n: number): number {
  return Math.round(n * 100) / 100
}

export type CardColumns = { n: 2 | 3; colW: number }

/**
 * Horizontal cards use three tracks from five dashboard units upward.
 * Non-grid cards keep a width fallback. Must mirror the CSS tracks
 * (repeat(n, 1fr), gap 16, inside padding 16); the -2 is the .item-viz
 * border — item.w is border-box.
 */
export function cardColumns(item: VizItem): CardColumns {
  const n = item.grid ? (item.grid.colSpan >= 5 ? 3 : 2) : (item.w >= 700 ? 3 : 2)
  return { n, colW: (item.w - 2 - PAD * 2 - GUTTER * (n - 1)) / n }
}

/** Card body height below the label row — the availH for textFits. */
export const bodyH = (item: VizItem) => item.h - 2 - PAD * 2 - LABEL_H

/** True when copy fits a midW×availH box without clipping (rough type metrics). */
export function textFits(midW: number, availH: number, copy: string): boolean {
  if (midW < 130) return false
  return Math.ceil(copy.length / (midW / 6)) * 17 <= availH
}

/** Gray weekday columns, "hoje" in white; sparse labels from the end. */
export function MiniColumns({ item, points }: { item: VizItem; points: WeekPoint[] }) {
  const w = cardColumns(item).colW
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

/** Connected values over a time interval, with sparse weekday labels. */
export function MiniTimeline({ item, points }: { item: VizItem; points: WeekPoint[] }) {
  const w = cardColumns(item).colW
  const h = Math.max(item.h - PAD * 2 - LABEL_H - 14, 40)
  return (
    <div className={`${s.minichart} ${s.timeline}`} style={{ width: w }}>
      <Sparkline values={points.map((point) => point.value)} width={w} height={h} area />
      <div
        className={`${s.minichartAxis} ${s.timelineAxis}`}
        style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
      >
        {points.map((point, i) => (
          <span key={i}>{(points.length - 1 - i) % 2 === 0 ? point.label : ''}</span>
        ))}
      </div>
    </div>
  )
}

/**
 * Compares article and event counts over the same interval and shared scale.
 */
export function MiniComparisonTimeline({
  item,
  articles,
  events,
}: {
  item: VizItem
  articles: WeekPoint[]
  events: WeekPoint[]
}) {
  const width = cardColumns(item).colW
  const height = Math.max(item.h - PAD * 2 - LABEL_H - 42, 28)
  const articleValues = articles.map((point) => point.value)
  const eventValues = events.map((point) => point.value)
  const max = Math.max(...articleValues, ...eventValues, 1) * 1.08
  const baseY = pointY(0, height, 0, max)

  return (
    <div className={`${s.minichart} ${s.comparisonTimeline}`} style={{ width }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="Contagem diária de artigos e eventos nos últimos sete dias"
      >
        <line
          className={s.comparisonBase}
          x1={0}
          x2={width}
          y1={baseY}
          y2={baseY}
        />
        <path
          className={`${s.comparisonLine} ${s.articleLine}`}
          d={seriesPath(articleValues, width, height, 0, max)}
        />
        <path
          className={`${s.comparisonLine} ${s.eventLine}`}
          d={seriesPath(eventValues, width, height, 0, max)}
        />
      </svg>
      <div
        className={`${s.minichartAxis} ${s.timelineAxis}`}
        style={{ gridTemplateColumns: `repeat(${articles.length}, minmax(0, 1fr))` }}
      >
        {articles.map((point, i) => (
          <span key={i}>{(articles.length - 1 - i) % 2 === 0 ? point.label : ''}</span>
        ))}
      </div>
      <div className={s.comparisonLegend} aria-hidden="true">
        <span><i className={s.articleKey} />Artigos</span>
        <span><i className={s.eventKey} />Eventos</span>
        <span className={s.intervalLabel}>7 dias</span>
      </div>
    </div>
  )
}

function pointY(value: number, height: number, min: number, max: number): number {
  const pad = 2
  return r2(pad + (height - pad * 2) * (1 - (value - min) / Math.max(max - min, 1)))
}

function seriesPath(
  values: number[],
  width: number,
  height: number,
  min: number,
  max: number,
): string {
  if (values.length < 2) return ''
  const step = (width - 4) / (values.length - 1)
  return values
    .map((value, i) => `${i === 0 ? 'M' : 'L'} ${r2(2 + i * step)} ${pointY(value, height, min, max)}`)
    .join(' ')
}
