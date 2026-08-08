import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { eventsKpi } from '../../../../news/series'
import { Delta } from '../../shared/Delta'
import { Shell } from '../../shared/Shell'
import { hasCopy, variantFor } from '../../shared/variant'
import sh from '../../shared/shared.module.css'
import s from './EventsCard.module.css'

const THRESHOLDS = { minAspect: 1.9, minW: 260, detailMinH: 140 }

export function EventsCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  const horizontal = variant === 'horizontal'
  const stat = eventsKpi(event)
  return (
    <Shell
      label="Eventos publicados"
      variant={variant}
      className={s.root}
      labelClassName={s.label}
    >
      <div className={s.kpiRow}>
        <div className={s.kpiMain}>
          <span className={s.number}>
            {stat.events}
            {!horizontal && <Delta value={stat.deltaEvents} />}
          </span>
          {!horizontal && hasCopy(item, variant) && (
            <p className={sh.detail}>{event.summary}</p>
          )}
        </div>
        {horizontal && (
          <div className={s.aside}>
            <div className={s.side}>
              <span className={s.sidePlain}>{stat.articles24h} artigos totais</span>
              <span className={s.sideDelta}>▲ +{stat.deltaEvents} eventos</span>
              <span className={s.sideDelta}>▲ +{stat.deltaArticles} artigos</span>
            </div>
            <span className={s.tag}>24h</span>
          </div>
        )}
      </div>
    </Shell>
  )
}
