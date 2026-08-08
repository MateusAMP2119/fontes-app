import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import {
  eventWeekSeries,
  evolutionMomentum,
  evolutionStats,
  metricDetail,
  weekSeries,
} from '../../../../news/series'
import { LABEL_H, PAD, r2, textFits } from '../../shared/charts'
import { Shell } from '../../shared/Shell'
import { variantFor } from '../../shared/variant'
import sh from '../../shared/shared.module.css'
import s from './EvolutionCard.module.css'

const THRESHOLDS = { minAspect: 2.2, minW: 340, detailMinH: 170 }

export function EvolutionCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  const horizontal = variant === 'horizontal'
  const roomy = variant === 'detail'
  const stats = evolutionStats(event)
  const copy = evolutionMomentum(event)
  const showCopy = horizontal && textFits(item.w * 0.52 - 228, item.h - 78, copy)
  return (
    <Shell
      label={variant === 'default' ? 'Evolução de art. e ev.' : 'Evolução de artigos e eventos'}
      variant={variant}
      className={s.root}
    >
      <div className={roomy ? s.detailWrap : s.kpiRow}>
        <EvolutionColumns
          item={item}
          event={event}
          wide={horizontal}
          fill={horizontal && !showCopy}
          maxH={roomy ? Math.max(item.h * 0.45, 64) : undefined}
        />
        {showCopy && <p className={s.midCopy}>{copy}</p>}
        {horizontal && (
          <div className={s.side}>
            <span className={s.sidePlain}>Média</span>
            <span className={s.sideStrong}>{stats.perEvent} artigos / evento</span>
            <span className={s.sidePlain}>{stats.articles.toLocaleString()} artigos</span>
            <span className={s.sidePlain}>{stats.events} eventos</span>
          </div>
        )}
        {roomy && <p className={s.detail}>{metricDetail(event, 'evolution')}</p>}
      </div>
    </Shell>
  )
}

/** Stacked article (gray) over event (white) columns. */
function EvolutionColumns({
  item,
  event,
  wide,
  fill,
  maxH,
}: {
  item: VizItem
  event: NewsEvent
  wide: boolean
  /** No middle copy — stretch the chart up to the side stats instead of leaving a void. */
  fill?: boolean
  /** Detail cards cap the chart so the body copy below keeps its room. */
  maxH?: number
}) {
  const arts = weekSeries(event)
  const evs = eventWeekSeries(event)
  const wideW = fill ? item.w - 220 - PAD * 2 : item.w * 0.48
  const w = Math.max(wide ? wideW : item.w - PAD * 2, 100)
  const h = Math.min(Math.max(item.h - PAD * 2 - LABEL_H - 22, 40), maxH ?? Infinity)
  const max = Math.max(...arts.map((p) => p.value))
  const evMax = Math.max(...evs.map((p) => p.value))
  const gap = 8
  const barW = (w - gap * (arts.length - 1)) / arts.length
  return (
    <div className={`${sh.minichart} ${s.chart}`} style={{ width: w }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        {arts.map((p, i) => {
          const artH = Math.max((p.value / max) * (h - 4), 4)
          const evH = Math.max((evs[i].value / evMax) * artH * 0.42, 2)
          const x = r2(i * (barW + gap))
          return (
            <g key={i}>
              <rect
                x={x}
                y={r2(h - artH)}
                width={r2(barW)}
                height={r2(artH - evH - 1)}
                rx={1.5}
                fill={p.today ? 'var(--chart-mid)' : 'var(--chart-dim)'}
              />
              <rect
                x={x}
                y={r2(h - evH)}
                width={r2(barW)}
                height={r2(evH)}
                rx={1.5}
                fill="var(--chart-fg)"
              />
            </g>
          )
        })}
      </svg>
      <div className={sh.minichartAxis}>
        {arts.map((p, i) => (
          <span key={i} style={{ width: barW + (i < arts.length - 1 ? gap : 0) }}>
            {(arts.length - 1 - i) % 2 === 0 ? p.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
