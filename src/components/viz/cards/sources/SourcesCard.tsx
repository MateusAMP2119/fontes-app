import type { CSSProperties } from 'react'
import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { sourceBreakdown, sourcesDelta, type Slice } from '../../../../news/series'
import { bodyH, cardColumns, textFits } from '../../shared/charts'
import { Shell } from '../../shared/Shell'
import { hasCopy, variantFor } from '../../shared/variant'
import sh from '../../shared/shared.module.css'
import metricS from '../events/EventsCard.module.css'
import s from './SourcesCard.module.css'

const THRESHOLDS = { minAspect: 1.9, minW: 260, detailMinH: 140 }

export function SourcesCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  const horizontal = variant === 'horizontal'
  const cols = horizontal ? cardColumns(item) : undefined
  const sourceMix = sourceSlices(sourceBreakdown(event))
  const leader = sourceMix.slices[0]
  const leaderShare = Math.round((leader.value / sourceMix.total) * 100)
  const newSources = sourcesDelta(event)
  const fullCopy = `Nas últimas 24h, ${newSources} novas fontes juntaram-se à cobertura. ${leader.label} lidera ${leaderShare}% dos artigos.`
  const compactCopy = `${newSources} fontes entraram em 24h. ${leader.label} lidera ${leaderShare}% dos artigos.`
  const copy = cols && textFits(cols.colW, bodyH(item) * 0.62, fullCopy) ? fullCopy : compactCopy
  const totalText = event.sourceCount.toLocaleString()
  const numberFit = {
    '--fit-width': `${100 / totalText.length}cqw`,
  } as CSSProperties
  return (
    <Shell label="Fontes ativas" variant={variant} columns={cols} className={metricS.root}>
      <div className={`${sh.kpiRow} ${metricS.kpiRow}`}>
        {horizontal && cols?.n === 3 ? (
          <>
            <div className={`${s.sourceSummary} ${sh.metricColumn}`}>
              <div className={metricS.headline}>
                <span
                  className={`${sh.number} ${metricS.fitText} ${metricS.number}`}
                  data-leading={totalText[0]}
                  style={numberFit}
                >
                  {totalText}
                </span>
                <span className={metricS.headlineUnit}>fontes</span>
              </div>
              <p className={s.sourceCopy}>{copy}</p>
            </div>
            <div className={`${s.legendColumn} ${sh.summaryColumn}`}>
              <SourcesLegend sourceMix={sourceMix} />
            </div>
          </>
        ) : (
          <div className={horizontal ? `${s.legendColumn} ${sh.metricColumn}` : s.legendColumn}>
            <SourcesLegend sourceMix={sourceMix} />
            {!horizontal && hasCopy(item, variant) && <p className={sh.detail}>{copy}</p>}
          </div>
        )}
        {horizontal && (
          <div className={sh.visualColumn}>
            <SourcesComposition item={item} sourceMix={sourceMix} />
          </div>
        )}
      </div>
    </Shell>
  )
}

const SOURCE_COLORS = ['#4f7fc4', '#7b3fb5', '#e78488', '#c7d712', '#55cee6', '#8b93a1', '#d7dce4']

type SourceMix = { slices: Slice[]; total: number }

function sourceSlices(sources: Slice[]): SourceMix {
  const visibleSources = sources.slice(0, 6)
  const otherSources = sources.slice(6)
  const otherValue = otherSources.reduce((sum, source) => sum + source.value, 0)
  const slices = otherValue > 0
    ? [...visibleSources, { label: `Outras ${otherSources.length}`, value: otherValue }]
    : visibleSources
  const total = slices.reduce((sum, source) => sum + source.value, 0)
  return { slices, total }
}

function SourcesLegend({ sourceMix: { slices, total } }: { sourceMix: SourceMix }) {
  const legendSources = slices.filter((source) => !isBarLabel(source, total))
  return (
    <div className={s.legend} aria-label="Fontes de notícias e respetiva quota de cobertura">
      {legendSources.map((source) => {
        const index = slices.indexOf(source)
        return (
        <span key={source.label}>
          <i style={{ background: SOURCE_COLORS[index] }} />
          <b>{source.label}</b>
          <em>{Math.round((source.value / total) * 100)}%</em>
        </span>
        )
      })}
    </div>
  )
}

function isBarLabel(source: Slice, total: number): boolean {
  return total > 0 && source.value / total >= 0.22
}

/** Outlet-level share of published coverage; smaller outlets roll into the final slice. */
function SourcesComposition({ item, sourceMix: { slices, total } }: { item: VizItem; sourceMix: SourceMix }) {
  const width = cardColumns(item).colW
  const height = Math.max(Math.min(bodyH(item) * 0.72, 56), 32)

  return (
    <figure
      className={s.composition}
      style={{ width }}
      aria-label={`Distribuição da cobertura por meio: ${slices.map((source) => `${source.label}, ${Math.round((source.value / total) * 100)}%`).join('; ')}`}
    >
      <div className={s.sourceBar} style={{ height }} aria-hidden="true">
        {slices.map((source, index) => {
          const showLabel = isBarLabel(source, total)
          return (
          <span
            key={source.label}
            className={s.barSegment}
            style={{ flexGrow: source.value, background: SOURCE_COLORS[index] }}
          >
            {showLabel && (
              <span className={`${s.barLabel} ${index === slices.length - 1 ? s.darkBarLabel : ''}`}>
                <b>{source.label}</b>
                <em>{Math.round((source.value / total) * 100)}%</em>
              </span>
            )}
          </span>
          )
        })}
      </div>
    </figure>
  )
}
