import type { CSSProperties } from 'react'
import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import {
  audienceClusterProfile,
  audienceClusterWeek,
  audienceFocusSummary,
  audienceInterestSummary,
  formatCompact,
  reachKpi,
  type AudienceClusterDay,
} from '../../../../news/series'
import { Sparkline } from '../../../Sparkline'
import { bodyH, cardColumns, PAD, textFits } from '../../shared/charts'
import { Shell } from '../../shared/Shell'
import { variantFor } from '../../shared/variant'
import sh from '../../shared/shared.module.css'
import metricS from '../events/EventsCard.module.css'
import s from './ReachCard.module.css'

const THRESHOLDS = { minAspect: 1.65, minW: 280, detailMinH: 140 }

export function ReachCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  const horizontal = variant === 'horizontal'
  const detail = variant === 'detail'
  const stat = reachKpi(event)
  const cols = horizontal ? cardColumns(item) : undefined
  const clusters = [...audienceClusterProfile(event)].sort((a, b) => b.value - a.value)
  const days = audienceClusterWeek(event)
  const focusSummary = audienceFocusSummary(event)
  const leaderReach = Math.round(stat.total * (clusters[0].value / 100))
  const totalText = formatCompact(stat.total).replace(' ', '')
  const fullSummary = audienceInterestSummary(event)
  const compactSummary = audienceInterestSummary(event, true)
  const detailCopy = textFits(item.w - 2 - PAD * 2, Math.max(bodyH(item) - 140, 0), fullSummary)
    ? fullSummary
    : compactSummary
  const coreFocusStory = `O tema mobiliza cerca de ${formatCompact(leaderReach)} pessoas entre ${clusters[0].label}.`
  const fullFocusStory = `O tema mobiliza cerca de ${formatCompact(leaderReach)} pessoas entre ${clusters[0].label}, sobretudo em ${focusSummary}.`
  const focusCopy = cols?.n === 3 && textFits(cols.colW, bodyH(item), fullFocusStory)
    ? fullFocusStory
    : coreFocusStory
  const showFocus = cols?.n === 3 && textFits(cols.colW, bodyH(item), focusCopy)
  const numberFit = {
    '--fit-width': `${100 / totalText.length}cqw`,
  } as CSSProperties
  const metric = (
    <div className={horizontal ? `${sh.metricColumn} ${metricS.metrics}` : s.metrics}>
      <div className={horizontal ? metricS.headline : s.headline}>
        <span
          className={horizontal
            ? `${sh.number} ${metricS.fitText} ${metricS.number}`
            : `${sh.number} ${s.number}`}
          data-leading={totalText[0]}
          style={horizontal ? numberFit : undefined}
        >
          {totalText}
        </span>
        <span className={horizontal ? metricS.headlineUnit : s.headlineCluster}>pessoas</span>
      </div>
      <div className={horizontal ? metricS.side : s.metricMeta}>
        <span className={horizontal ? `${metricS.fitText} ${metricS.sideDelta}` : undefined}>
          <i className={metricS.trendArrow}>▲</i>{' '}
          +{formatCompact(stat.delta24h)} pessoas
        </span>
        <span className={horizontal ? `${metricS.fitText} ${metricS.sideDelta}` : undefined}>
          <i className={metricS.trendArrow}>▲</i>{' '}
          {stat.activityLift}% mais ativo
        </span>
      </div>
    </div>
  )
  return (
    <Shell
      label="Alcance estimado"
      variant={variant}
      columns={cols}
      className={`${s.root} ${metricS.root}`}
    >
      {detail ? (
        <div className={s.detailWrap}>
          {metric}
          <p className={`${sh.detail} ${s.detailCopy}`}>{detailCopy}</p>
          <ReachAreaChart
            width={item.w - 2 - PAD * 2}
            height={Math.max(item.h * 0.32, 82)}
            days={days}
          />
        </div>
      ) : (
        <div className={`${sh.kpiRow} ${metricS.kpiRow}`}>
          {metric}
          {showFocus && (
            <p className={`${sh.detail} ${sh.midCopy}`}>{focusCopy}</p>
          )}
          {horizontal && cols && (
            <div className={sh.visualColumn}>
              <ReachAreaChart
                width={cols.colW}
                height={Math.max(bodyH(item), 56)}
                days={days}
              />
            </div>
          )}
        </div>
      )}
    </Shell>
  )
}

/** Simple seven-day reach trend; audience context stays in the copy. */
function ReachAreaChart({
  width,
  height,
  days,
}: {
  width: number
  height: number
  days: AudienceClusterDay[]
}) {
  const chartHeight = Math.max(height - 14, 30)
  const values = days.map((day) => day.total)

  return (
    <figure
      className={s.reachTrend}
      style={{ width }}
      aria-label="Evolução diária do alcance estimado nos últimos sete dias."
    >
      <Sparkline
        values={values}
        width={width}
        height={chartHeight}
        className={s.reachArea}
        area
        strokeWidth={2.2}
      />
      <figcaption className={s.reachAxis} aria-hidden="true">
        {days.map((day, i) => (
          <span key={`${day.label}-${i}`}>
            {(days.length - 1 - i) % 2 === 0 ? day.label : ''}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
