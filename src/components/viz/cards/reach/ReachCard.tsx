import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { audienceSegment, reachKpi, weekSeries } from '../../../../news/series'
import { MiniColumns } from '../../shared/charts'
import { Delta } from '../../shared/Delta'
import { Shell } from '../../shared/Shell'
import { hasCopy, variantFor } from '../../shared/variant'
import sh from '../../shared/shared.module.css'
import s from './ReachCard.module.css'

const THRESHOLDS = { minAspect: 1.9, minW: 260, detailMinH: 140 }

export function ReachCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  const stat = reachKpi(event)
  return (
    <Shell label="Alcance estimado" variant={variant} className={s.root}>
      <div className={s.kpiRow}>
        <div className={s.kpiMain}>
          <span className={s.number}>
            {stat.value}
            <Delta value={stat.delta} />
          </span>
          <span className={s.segment}>{audienceSegment(event)} ⌄</span>
          {hasCopy(item, variant) && <p className={sh.detail}>{event.summary}</p>}
        </div>
        {variant === 'horizontal' && <MiniColumns item={item} points={weekSeries(event)} />}
      </div>
    </Shell>
  )
}
