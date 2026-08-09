import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import {
  breakdownSparkline,
  eventsKpi,
  sourceBreakdown,
  type Slice,
} from '../../../../news/series'
import { Sparkline } from '../../../Sparkline'
import { IdentityMark } from '../../shared/IdentityMarks'
import { List, ListCell, ListRow } from '../../shared/List'
import { Shell } from '../../shared/Shell'
import s from './BreakdownCard.module.css'

export function CoverageCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  return (
    <Breakdown
      item={item}
      event={event}
      label="Cobertura por fonte"
      rows={sourceBreakdown(event)}
    />
  )
}

/** Ranked list with the shared header-row format; wide cards add a trend column. */
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
  const share = (v: number) => Math.max(Math.round((v / total) * 100), 1)
  const wide = item.w / item.h >= 1.7 && item.w >= 380
  const columns = wide
    ? ['minmax(180px, 1fr)', 'minmax(150px, 1.1fr)']
    : ['minmax(0, 1fr)']

  return (
    <Shell label={label} variant={wide ? 'horizontal' : 'default'}>
      <List label={label} columns={columns} className={s.list}>
        {rows.map((row, i) => (
          <ListRow key={row.label} className={s.row}>
            <ListCell className={s.name}>
              <span className={s.rank}>{i + 1}</span>
              <IdentityMark name={row.label} />
              <span className={s.copy}>
                <span className={s.nameLine}>
                  <span className={s.nameText}>{row.label}</span>
                </span>
                <span className={s.meta}>
                  {art(row.value)} artigos · {share(row.value)}% da cobertura
                </span>
              </span>
            </ListCell>
            {wide && (
              <ListCell className={s.spark}>
                <Sparkline
                  values={breakdownSparkline(event, row.label)}
                  width={220}
                  height={22}
                  strokeWidth={1.35}
                />
              </ListCell>
            )}
          </ListRow>
        ))}
      </List>
    </Shell>
  )
}
