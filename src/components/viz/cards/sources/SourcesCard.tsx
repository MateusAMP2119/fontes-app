import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { metricDetail, sourcesDelta } from '../../../../news/series'
import { bodyH, cardColumns, textFits } from '../../shared/charts'
import { Delta } from '../../shared/Delta'
import { Shell } from '../../shared/Shell'
import { hasCopy, variantFor } from '../../shared/variant'
import sh from '../../shared/shared.module.css'
import s from './SourcesCard.module.css'

const THRESHOLDS = { minAspect: 1.9, minW: 260, detailMinH: 140 }

export function SourcesCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  const horizontal = variant === 'horizontal'
  const cols = horizontal ? cardColumns(item) : undefined
  const copy = metricDetail(event, 'sources')
  const showSummary = cols?.n === 3 && textFits(cols.colW, bodyH(item), copy)
  const newSources = sourcesDelta(event)
  return (
    <Shell label="Fontes ativas" variant={variant} columns={cols}>
      <div className={sh.kpiRow}>
        <div className={horizontal ? `${sh.kpiMain} ${sh.metricColumn}` : sh.kpiMain}>
          <span className={sh.number}>
            {event.sourceCount.toLocaleString()}
            <Delta value={newSources} suffix="fontes" />
          </span>
          {!horizontal && hasCopy(item, variant) && <p className={sh.detail}>{copy}</p>}
        </div>
        {showSummary && <p className={`${sh.detail} ${sh.summaryColumn}`}>{copy}</p>}
        {horizontal && (
          <div className={sh.visualColumn}>
            <SourcesComposition item={item} total={event.sourceCount} added={newSources} />
          </div>
        )}
      </div>
    </Shell>
  )
}

/** 100% stacked bar: newly active sources as a part of all active sources. */
function SourcesComposition({ item, total, added }: { item: VizItem; total: number; added: number }) {
  const width = cardColumns(item).colW
  const safeAdded = Math.min(Math.max(added, 0), total)
  const existing = total - safeAdded
  const addedShare = total > 0 ? (safeAdded / total) * 100 : 0
  return (
    <figure
      className={s.composition}
      style={{ width }}
      aria-label={`${safeAdded} fontes novas e ${existing} já ativas, num total de ${total}`}
    >
      <div className={s.compositionHeading}>
        <span>Novas (24 h)</span>
        <strong>{Math.round(addedShare)}%</strong>
      </div>
      <div className={s.stack} aria-hidden="true">
        <i className={s.newSources} style={{ width: `${addedShare}%` }} />
        <i className={s.existingSources} style={{ width: `${100 - addedShare}%` }} />
      </div>
      <div className={s.legend} aria-hidden="true">
        <span><i className={s.newKey} />Novas {safeAdded}</span>
        <span><i className={s.existingKey} />Ativas {existing}</span>
      </div>
    </figure>
  )
}
