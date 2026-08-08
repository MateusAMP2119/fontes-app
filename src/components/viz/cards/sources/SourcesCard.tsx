import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { metricDetail, sourcesDelta, weekSeries } from '../../../../news/series'
import { MiniColumns } from '../../shared/charts'
import { Delta } from '../../shared/Delta'
import { Shell } from '../../shared/Shell'
import { hasCopy, variantFor } from '../../shared/variant'
import sh from '../../shared/shared.module.css'
import s from './SourcesCard.module.css'

const THRESHOLDS = { minAspect: 1.9, minW: 260, detailMinH: 140 }

export function SourcesCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  return (
    <Shell label="Fontes ativas" variant={variant} className={s.root}>
      <div className={s.kpiRow}>
        <div className={s.kpiMain}>
          <span className={s.number}>
            {event.sourceCount.toLocaleString()}
            <Delta value={sourcesDelta(event)} />
          </span>
          {hasCopy(item, variant) && <p className={sh.detail}>{metricDetail(event, 'sources')}</p>}
        </div>
        {variant === 'horizontal' && <MiniColumns item={item} points={weekSeries(event)} />}
      </div>
    </Shell>
  )
}
