import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { metricDetail, sentimentSeries, toneSplit } from '../../../../news/series'
import { LABEL_H, PAD, r2 } from '../../shared/charts'
import { Shell } from '../../shared/Shell'
import { hasCopy, variantFor } from '../../shared/variant'
import sh from '../../shared/shared.module.css'
import s from './SentimentCard.module.css'

const THRESHOLDS = { minAspect: 1.9, minW: 380, detailMinH: 140 }

export function SentimentCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  const [pos, neu, neg] = toneSplit(event)
  const pct = (v: number) => `${Math.round(v * 100)}%`
  return (
    <Shell label="Análise de sentimentos" variant={variant} className={s.root}>
      <div className={s.kpiRow}>
        <div className={s.kpiMain}>
          <span className={s.number}>{pct(pos.value)} Positivo</span>
          <div className={s.toneRows}>
            <span>
              <em>{pct(neu.value)}</em> Neutro
            </span>
            <span>
              <em>{pct(neg.value)}</em> Negativo
            </span>
          </div>
          {hasCopy(item, variant) && <p className={sh.detail}>{metricDetail(event, 'sentiment')}</p>}
        </div>
        {variant === 'horizontal' && <SentimentColumns item={item} event={event} />}
      </div>
    </Shell>
  )
}

/** Green/gray/red stacked daily sentiment columns. */
function SentimentColumns({ item, event }: { item: VizItem; event: NewsEvent }) {
  const days = sentimentSeries(event)
  const w = Math.min(Math.max(item.w * 0.42, 140), 260)
  const h = Math.max(item.h - PAD * 2 - LABEL_H - 14, 40)
  const gap = 7
  const barW = (w - gap * (days.length - 1)) / days.length
  const seg = 1.5
  return (
    <div className={sh.minichart} style={{ width: w }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        {days.map((d, i) => {
          const x = r2(i * (barW + gap))
          const posH = d.positive * (h - seg * 2)
          const neuH = d.neutral * (h - seg * 2)
          const negH = d.negative * (h - seg * 2)
          return (
            <g key={i}>
              <rect x={x} y={0} width={r2(barW)} height={r2(posH)} rx={1.5} fill="var(--pos)" />
              <rect
                x={x}
                y={r2(posH + seg)}
                width={r2(barW)}
                height={r2(neuH)}
                rx={1.5}
                fill="var(--chart-dim)"
              />
              <rect
                x={x}
                y={r2(posH + seg + neuH + seg)}
                width={r2(barW)}
                height={r2(negH)}
                rx={1.5}
                fill="var(--neg)"
              />
            </g>
          )
        })}
      </svg>
      <div className={sh.minichartAxis}>
        {days.map((d, i) => (
          <span key={i} style={{ width: barW + (i < days.length - 1 ? gap : 0) }}>
            {(days.length - 1 - i) % 2 === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
