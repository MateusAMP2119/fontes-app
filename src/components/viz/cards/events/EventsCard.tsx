import type { CSSProperties } from 'react'
import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { eventWeekSeries, eventsKpi, weekSeries } from '../../../../news/series'
import { bodyH, cardColumns, MiniComparisonTimeline, textFits } from '../../shared/charts'
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
  const eventText = String(stat.events)
  const cols = horizontal ? cardColumns(item) : undefined
  const showSummary = cols?.n === 3 && textFits(cols.colW, bodyH(item), event.summary)
  const numberFit = {
    '--fit-width': `${100 / eventText.length}cqw`,
  } as CSSProperties
  return (
    <Shell
      label="Eventos publicados"
      variant={variant}
      columns={cols}
      className={s.root}
      labelClassName={s.label}
    >
      {horizontal ? (
        <div className={`${sh.kpiRow} ${s.kpiRow}`}>
          <div className={`${sh.metricColumn} ${s.metrics}`}>
            <div className={s.headline}>
              <span
                className={`${sh.number} ${s.fitText} ${s.number}`}
                data-leading={eventText[0]}
                style={numberFit}
              >
                {eventText}
              </span>
              <span className={s.headlineUnit}>eventos</span>
            </div>
            <div className={s.side}>
              <span className={`${s.fitText} ${s.sideDelta}`}>
                ▲ +{stat.deltaEvents} eventos
              </span>
              <span className={`${s.fitText} ${s.sideDelta}`}>
                ▲ +{stat.deltaArticles} artigos
              </span>
            </div>
          </div>
          {showSummary && <p className={`${sh.detail} ${sh.summaryColumn}`}>{event.summary}</p>}
          <div className={sh.visualColumn}>
            <MiniComparisonTimeline
              item={item}
              articles={weekSeries(event)}
              events={eventWeekSeries(event)}
            />
          </div>
        </div>
      ) : (
        <div className={`${sh.kpiRow} ${s.kpiRow}`}>
          <div className={sh.kpiMain}>
            <span className={`${sh.number} ${s.number}`}>
              {eventText}
              <span className={s.headlineUnit}>eventos</span>
              <Delta value={stat.deltaEvents} />
            </span>
            {hasCopy(item, variant) && (
              <p className={sh.detail}>{event.summary}</p>
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}
