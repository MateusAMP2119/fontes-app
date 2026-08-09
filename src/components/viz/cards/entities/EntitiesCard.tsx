import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { entityImage } from '../../../../news/narrativeImages'
import { breakdownSparkline, entityBreakdown, formatCompact } from '../../../../news/series'
import { Sparkline } from '../../../Sparkline'
import { List, ListCell, ListRow } from '../../shared/List'
import { Shell } from '../../shared/Shell'
import s from './EntitiesCard.module.css'

export function EntitiesCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const rows = entityBreakdown(event)
  const compact = item.w <= 300
  const narrow = item.w <= 440
  const columns = compact
    ? ['var(--entity-media-column, 54px)', 'minmax(0, 1fr)']
    : narrow
      ? [
          'var(--entity-media-column, 52px)',
          'minmax(0, 1fr)',
          'var(--entity-stats-column, 78px)',
        ]
      : [
          'var(--entity-media-column, 68px)',
          'minmax(0, 1fr)',
          'var(--entity-spark-column, 88px)',
          'var(--entity-stats-column, 82px)',
        ]

  return (
    <Shell label="Entidades e intervenientes" variant="default" labelClassName={s.label}>
      <List
        label="Entidades e intervenientes"
        columns={columns}
        className={s.list}
        fade
      >
        {rows.map((row, index) => (
          <ListRow key={row.label} className={s.row}>
            <ListCell className={s.imageCell}>
              <img
                src={entityImage(event, row.label, row.imageIndex + index)}
                alt=""
                loading="lazy"
              />
            </ListCell>
            <ListCell className={s.text}>
              <span className={s.title}>{row.label}</span>
              <p className={s.summary}>{row.role}. {shortAction(row.description)}</p>
            </ListCell>
            {!narrow && (
              <ListCell className={s.sparkCell}>
                <figure
                  className={s.spark}
                  aria-label={`Evolução das menções a ${row.label}`}
                >
                  <Sparkline
                    values={breakdownSparkline(event, row.label, 18)}
                    width={88}
                    height={24}
                    strokeWidth={1.5}
                    area
                  />
                </figure>
              </ListCell>
            )}
            {!compact && (
              <ListCell className={s.stats}>
                <strong>{formatCompact(row.articles)} artigos</strong>
                <span>{formatCompact(row.fontes)} fontes</span>
              </ListCell>
            )}
          </ListRow>
        ))}
      </List>
    </Shell>
  )
}

function shortAction(description: string): string {
  return description.split('. ')[0].replace(/\.$/, '')
}
