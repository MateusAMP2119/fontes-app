import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import {
  breakdownSparkline,
  entityBreakdown,
  eventsKpi,
  sourceBreakdown,
  weekSeries,
  type Slice,
} from '../../../../news/series'
import { Sparkline } from '../../../Sparkline'
import { LABEL_H, PAD } from '../../shared/charts'
import { Shell } from '../../shared/Shell'
import s from './BreakdownCard.module.css'

const ROW_H = 30
const FIRST_H = 54
const SPARK_ROW_H = 34
const SPARK_FIRST_H = 60

export function CoverageCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  return <Breakdown item={item} event={event} label="Cobertura por fonte" rows={sourceBreakdown(event)} />
}

export function EntitiesCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  return <Breakdown item={item} event={event} label="Entidades e intervenientes" rows={entityBreakdown(event)} />
}

/** Ranked list; a wide card gets a trend line per row, axis on the lead only. */
function Breakdown({
  item,
  event,
  label,
  rows,
}: {
  item: VizItem
  event: NewsEvent
  label: string
  rows: Slice[]
}) {
  const total = rows.reduce((a, r) => a + r.value, 0)
  const dayTotal = eventsKpi(event).articles24h
  const art = (v: number) => Math.max(Math.round((v / total) * dayTotal), 1)
  const innerH = item.h - PAD * 2 - LABEL_H
  const wide = item.w / item.h >= 1.7 && item.w >= 380

  if (wide) {
    const count = Math.min(
      rows.length,
      Math.max(Math.floor((innerH - SPARK_FIRST_H) / SPARK_ROW_H) + 1, 2),
    )
    const week = weekSeries(event)
    const axis = week.filter((_, i) => (week.length - 1 - i) % 2 === 0)
    return (
      <Shell label={label} variant="horizontal" className={s.root}>
        <ul className={s.wideList}>
          {rows.slice(0, count).map((row, i) => (
            <li key={row.label} className={i === 0 ? s.isLead : undefined}>
              <div className={s.head}>
                <span className={s.name}>{row.label}</span>
                <span className={s.count}>{art(row.value)} art.</span>
              </div>
              <div className={s.spark}>
                <Sparkline
                  values={breakdownSparkline(event, row.label)}
                  width={220}
                  height={i === 0 ? 30 : 20}
                  strokeWidth={1.4}
                />
                {i === 0 && (
                  <div className={s.axis}>
                    {axis.map((p) => (
                      <span key={p.label}>{p.label}</span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Shell>
    )
  }

  const count = Math.min(
    rows.length,
    Math.max(Math.floor((innerH - FIRST_H) / ROW_H) + 1, 2),
  )
  return (
    <Shell label={label} variant="default" className={s.root}>
      <ul className={s.list}>
        {rows.slice(0, count).map((row, i) => (
          <li key={row.label} className={i === 0 ? s.isLead : undefined}>
            <span className={s.name}>{row.label}</span>
            <span className={s.count}>{art(row.value)} art.</span>
          </li>
        ))}
      </ul>
    </Shell>
  )
}
