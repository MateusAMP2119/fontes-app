import type { CSSProperties } from 'react'
import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { entityBreakdown, formatCompact } from '../../../../news/series'
import { bodyH, cardColumns } from '../../shared/charts'
import { Shell } from '../../shared/Shell'
import { variantFor } from '../../shared/variant'
import s from './EntitiesCard.module.css'

const THRESHOLDS = { minAspect: 1.9, minW: 380, detailMinH: 140 }

export function EntitiesCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  const horizontal = variant === 'horizontal'
  const columns = horizontal ? cardColumns(item) : undefined
  const availableH = bodyH(item)
  const compact = availableH < 115
  const visibleCount = compact ? 2 : availableH < 170 ? 3 : 4
  const rows = entityBreakdown(event)
  const visible = rows.slice(0, visibleCount)
  const remainder = rows.slice(visibleCount)
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const otherTotal = remainder.reduce((sum, row) => sum + row.value, 0)
  const max = Math.max(...visible.map((row) => row.value), 1)
  const share = (value: number) => Math.round((value / total) * 100)

  return (
    <Shell
      label="Entidades e intervenientes"
      variant={variant}
      columns={columns}
      className={s.root}
    >
      <section
        className={s.ranking}
        data-compact={compact ? '' : undefined}
        aria-label={`${total.toLocaleString()} menções por entidade, ordenadas da maior para a menor presença`}
      >
        <div className={s.summary}>
          <span>Ranking por volume de menções</span>
          <strong>{formatCompact(total)} <em>menções</em></strong>
        </div>

        <div className={s.rows}>
          {visible.map((row, index) => (
            <article key={row.label} className={s.row}>
              <div className={s.rowHeading}>
                <strong>{row.label}</strong>
                <span>{formatCompact(row.value)} · {share(row.value)}%</span>
              </div>
              <p className={s.entityContext}>{row.role} · {shortAction(row.description)}</p>
              <div className={s.track} aria-hidden="true">
                <i
                  className={index === 0 ? s.leaderBar : undefined}
                  style={{ '--bar-width': `${(row.value / max) * 100}%` } as CSSProperties}
                />
              </div>
            </article>
          ))}
        </div>

        {remainder.length > 0 && (
          <div className={s.others}>
            <span>+{remainder.length} outras entidades</span>
            <strong>{formatCompact(otherTotal)} · {share(otherTotal)}%</strong>
          </div>
        )}
      </section>
    </Shell>
  )
}

function shortAction(description: string): string {
  return description.split('. ')[0].replace(/\.$/, '')
}
