/**
 * Widget bodies, matching the Figma "Widgets" file: black cards, uppercase
 * gray labels, monochrome charts, red/green reserved for sentiment.
 *
 * Every number comes from the seeded generators in src/news/series, keyed on
 * the item's eventId + metric, so a widget renders identically forever. The
 * variant (default / horizontal / detail) is derived from the item's own
 * shape at render time — nothing about it is persisted.
 */

import type { ReactNode } from 'react'
import type { VizItem, VizMetric } from '../items/items'
import { findEvent, type EventCategory, type NewsEvent } from '../news/events'
import { narrativeImage } from '../news/narrativeImages'
import {
  audienceSegment,
  breakdownSparkline,
  entityBreakdown,
  eventsKpi,
  eventWeekSeries,
  evolutionStats,
  metricDetail,
  narratives,
  reachKpi,
  sentimentSeries,
  sourceBreakdown,
  sourcesDelta,
  toneSplit,
  weekSeries,
  type Slice,
  type WeekPoint,
} from '../news/series'
import { Sparkline } from './Sparkline'

type Variant = 'default' | 'horizontal' | 'detail'

/** Card padding; charts derive their box from item.w/h minus these. */
const PAD = 16
const LABEL_H = 26

const LABELS: Partial<Record<VizMetric, string>> = {
  events: 'Eventos publicados',
  reach: 'Alcance estimado',
  sources: 'Fontes ativas',
  sentiment: 'Análise de sentimentos',
  evolution: 'Evolução de art. e ev.',
  coverage: 'Cobertura por fonte',
  entities: 'Entidades e intervenientes',
  narratives: 'Principais narrativas',
}

const CATEGORY_PT: Record<EventCategory, string> = {
  World: 'Mundo',
  Business: 'Economia',
  Tech: 'Tecnologia',
  Science: 'Ciência',
  Climate: 'Clima',
  Sport: 'Desporto',
  Culture: 'Cultura',
}

export function VizBody({ item }: { item: VizItem }) {
  const event = findEvent(item.eventId)
  if (!event) {
    return <div className="item-viz-missing">Tópico indisponível</div>
  }
  switch (item.kind) {
    case 'kpi':
      return <KpiBody item={item} event={event} />
    case 'sentiment':
      return <SentimentBody item={item} event={event} />
    case 'evolution':
      return <EvolutionBody item={item} event={event} />
    case 'coverage':
      return <BreakdownBody item={item} event={event} rows={sourceBreakdown(event)} />
    case 'entities':
      return <BreakdownBody item={item} event={event} rows={entityBreakdown(event)} />
    case 'narratives':
      return <NarrativesBody item={item} event={event} />
    default:
      return null
  }
}

function shell(item: VizItem, variant: Variant, children: ReactNode, tag?: string) {
  return (
    <div className={`viz-card viz-${item.kind} viz-m-${item.metric} is-${variant}`}>
      <div className="viz-label-row">
        <span className="viz-label">{LABELS[item.metric] ?? item.title}</span>
        {tag && <span className="viz-tag">{tag}</span>}
      </div>
      {children}
    </div>
  )
}

function Delta({ value, suffix }: { value: number; suffix?: string }) {
  const down = value < 0
  return (
    <span className={`viz-delta${down ? ' is-down' : ''}`}>
      {down ? '▼' : '▲'} {down ? `−${Math.abs(value)}` : `+${value}`}
      {suffix ? ` ${suffix}` : ''}
    </span>
  )
}

/* —— kpi (Widgets 1–3: eventos, alcance, fontes) —— */

function KpiBody({ item, event }: { item: VizItem; event: NewsEvent }) {
  const aspect = item.w / item.h
  const horizontal = aspect >= 1.9 && item.w >= 260
  const roomy = !horizontal && item.h >= 140
  // A horizontal card with real height carries body copy too.
  const copy = roomy || (horizontal && item.h >= 150)

  if (item.metric === 'events') {
    const stat = eventsKpi(event)
    return shell(
      item,
      horizontal ? 'horizontal' : roomy ? 'detail' : 'default',
      <div className="viz-kpi-row">
        <div className="viz-kpi-main">
          <span className="viz-number">
            {stat.events}
            {!horizontal && <Delta value={stat.deltaEvents} />}
          </span>
          {!horizontal && copy && <p className="viz-detail">{event.summary}</p>}
        </div>
        {horizontal && (
          <div className="viz-kpi-aside">
            <div className="viz-kpi-side">
              <span className="viz-side-plain">{stat.articles24h} artigos totais</span>
              <span className="viz-side-delta">▲{' '}+{stat.deltaEvents} eventos</span>
              <span className="viz-side-delta">▲{' '}+{stat.deltaArticles} artigos</span>
            </div>
            <span className="viz-tag">24h</span>
          </div>
        )}
      </div>,
    )
  }

  if (item.metric === 'reach') {
    const stat = reachKpi(event)
    return shell(
      item,
      horizontal ? 'horizontal' : roomy ? 'detail' : 'default',
      <div className="viz-kpi-row">
        <div className="viz-kpi-main">
          <span className="viz-number">
            {stat.value}
            <Delta value={stat.delta} />
          </span>
          <span className="viz-segment">{audienceSegment(event)} ⌄</span>
          {copy && <p className="viz-detail">{event.summary}</p>}
        </div>
        {horizontal && <MiniColumns item={item} points={weekSeries(event)} />}
      </div>,
    )
  }

  // sources — plain figure; a tall card adds the coverage sentence (Widget 3)
  const delta = sourcesDelta(event)
  return shell(
    item,
    horizontal ? 'horizontal' : roomy ? 'detail' : 'default',
    <div className="viz-kpi-row">
      <div className="viz-kpi-main">
        <span className="viz-number">
          {event.sourceCount.toLocaleString()}
          <Delta value={delta} />
        </span>
        {copy && <p className="viz-detail">{metricDetail(event, 'sources')}</p>}
      </div>
      {horizontal && <MiniColumns item={item} points={weekSeries(event)} />}
    </div>,
  )
}

/* —— sentiment (Widget 5) —— */

function SentimentBody({ item, event }: { item: VizItem; event: NewsEvent }) {
  const horizontal = item.w / item.h >= 1.9 && item.w >= 380
  const roomy = !horizontal && item.h >= 140
  const copy = roomy || (horizontal && item.h >= 150)
  const [pos, neu, neg] = toneSplit(event)
  const pct = (v: number) => `${Math.round(v * 100)}%`
  return shell(
    item,
    horizontal ? 'horizontal' : roomy ? 'detail' : 'default',
    <div className="viz-kpi-row">
      <div className="viz-kpi-main">
        <span className="viz-number viz-number-sentiment">{pct(pos.value)} Positivo</span>
        <div className="viz-tone-rows">
          <span>
            <em>{pct(neu.value)}</em> Neutro
          </span>
          <span>
            <em>{pct(neg.value)}</em> Negativo
          </span>
        </div>
        {copy && <p className="viz-detail">{metricDetail(event, 'sentiment')}</p>}
      </div>
      {horizontal && <SentimentColumns item={item} event={event} />}
    </div>,
  )
}

/* —— evolution (Widget 6) —— */

function EvolutionBody({ item, event }: { item: VizItem; event: NewsEvent }) {
  const horizontal = item.w / item.h >= 2.2 && item.w >= 340
  const roomy = !horizontal && item.h >= 170
  const stats = evolutionStats(event)
  return shell(
    item,
    horizontal ? 'horizontal' : roomy ? 'detail' : 'default',
    <div className={roomy ? 'viz-evolution-detail' : 'viz-kpi-row'}>
      <EvolutionColumns
        item={item}
        event={event}
        wide={horizontal}
        maxH={roomy ? Math.max(item.h * 0.45, 64) : undefined}
      />
      {horizontal && (
        <div className="viz-kpi-side viz-evolution-side">
          <span className="viz-side-plain">Média</span>
          <span className="viz-side-strong">{stats.perEvent} artigos / evento</span>
          <span className="viz-side-plain">{stats.articles.toLocaleString()} artigos</span>
          <span className="viz-side-plain">{stats.events} eventos</span>
        </div>
      )}
      {roomy && <p className="viz-detail">{metricDetail(event, 'evolution')}</p>}
    </div>,
  )
}

/* —— coverage / entities (Widgets 7 & 9) —— */

const COVERAGE_ROW_H = 30
const COVERAGE_FIRST_H = 54
const SPARK_ROW_H = 34
const SPARK_FIRST_H = 60

/**
 * Ranked breakdown card, shared by "Cobertura por fonte" and "Entidades e
 * intervenientes". Narrow cards get the plain list; a wide card gets a trend
 * line per row, axis labels on the lead row only.
 */
function BreakdownBody({ item, event, rows }: { item: VizItem; event: NewsEvent; rows: Slice[] }) {
  const total = rows.reduce((a, r) => a + r.value, 0)
  const dayTotal = eventsKpi(event).articles24h
  const art = (v: number) => Math.max(Math.round((v / total) * dayTotal), 1)
  const innerH = item.h - PAD * 2 - LABEL_H
  const wide = item.w / item.h >= 1.7 && item.w >= 380

  if (wide) {
    const count = Math.min(
      rows.length,
      Math.max(Math.floor((innerH - SPARK_FIRST_H) / SPARK_ROW_H) + 1, 2),
    )
    const week = weekSeries(event)
    const axis = week.filter((_, i) => (week.length - 1 - i) % 2 === 0)
    return shell(
      item,
      'horizontal',
      <ul className="viz-breakdown">
        {rows.slice(0, count).map((row, i) => (
          <li key={row.label} className={i === 0 ? 'is-lead' : undefined}>
            <div className="viz-breakdown-head">
              <span className="viz-coverage-name">{row.label}</span>
              <span className="viz-coverage-count">{art(row.value)} art.</span>
            </div>
            <div className="viz-breakdown-spark">
              <Sparkline
                values={breakdownSparkline(event, row.label)}
                width={220}
                height={i === 0 ? 30 : 20}
                strokeWidth={1.4}
              />
              {i === 0 && (
                <div className="viz-breakdown-axis">
                  {axis.map((p) => (
                    <span key={p.label}>{p.label}</span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>,
    )
  }

  const count = Math.min(
    rows.length,
    Math.max(Math.floor((innerH - COVERAGE_FIRST_H) / COVERAGE_ROW_H) + 1, 2),
  )
  return shell(
    item,
    'default',
    <ul className="viz-coverage">
      {rows.slice(0, count).map((row, i) => (
        <li key={row.label} className={i === 0 ? 'is-lead' : undefined}>
          <span className="viz-coverage-name">{row.label}</span>
          <span className="viz-coverage-count">{art(row.value)} art.</span>
        </li>
      ))}
    </ul>,
  )
}

/* —— narratives (Widget 8) —— */

const NARRATIVE_ROW_H = 76

function NarrativesBody({ item, event }: { item: VizItem; event: NewsEvent }) {
  const rows = narratives(event)
  const card = item.w / item.h < 1.2
  const tag = CATEGORY_PT[event.category]

  if (card) {
    const row = rows[0]
    return shell(
      item,
      'default',
      <div className="viz-narrative-card">
        <img src={narrativeImage(event.category, row.imageIndex)} alt="" loading="lazy" />
        <div className="viz-narrative-meta">
          <span className="viz-narrative-tag">{tag}</span>
          <span className="viz-narrative-counts">
            {row.articles} artigos · {row.fontes} fontes
          </span>
        </div>
        <span className="viz-narrative-title">{row.title}</span>
        <p className="viz-narrative-summary">{row.summary}</p>
      </div>,
    )
  }

  const innerH = item.h - PAD * 2 - LABEL_H
  const count = Math.min(rows.length, Math.max(Math.floor(innerH / NARRATIVE_ROW_H), 1))
  return shell(
    item,
    'horizontal',
    <ul className="viz-narratives">
      {rows.slice(0, count).map((row, i) => (
        <li key={row.title}>
          <img
            src={narrativeImage(event.category, row.imageIndex + i)}
            alt=""
            loading="lazy"
          />
          <div className="viz-narrative-text">
            <span className="viz-narrative-tag">{tag}</span>
            <span className="viz-narrative-title">{row.title}</span>
            <p className="viz-narrative-summary">{row.summary}</p>
            <span className="viz-narrative-counts">
              {row.articles} artigos&ensp;·&ensp;{row.fontes} fontes
            </span>
          </div>
        </li>
      ))}
    </ul>,
  )
}

/* —— chart primitives —— */

/** Gray weekday columns, "hoje" in white; sparse labels from the end. */
function MiniColumns({ item, points }: { item: VizItem; points: WeekPoint[] }) {
  const w = Math.min(Math.max(item.w * 0.42, 120), 220)
  const h = Math.max(item.h - PAD * 2 - LABEL_H - 14, 40)
  const max = Math.max(...points.map((p) => p.value))
  const gap = 6
  const barW = (w - gap * (points.length - 1)) / points.length
  return (
    <div className="viz-minichart" style={{ width: w }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        {points.map((p, i) => {
          const bh = Math.max((p.value / max) * (h - 4), 3)
          return (
            <rect
              key={i}
              x={r2(i * (barW + gap))}
              y={r2(h - bh)}
              width={r2(barW)}
              height={r2(bh)}
              rx={1.5}
              fill={p.today ? 'var(--chart-fg)' : 'var(--chart-dim)'}
            />
          )
        })}
      </svg>
      <div className="viz-minichart-axis">
        {points.map((p, i) => (
          <span key={i} style={{ width: barW + (i < points.length - 1 ? gap : 0) }}>
            {(points.length - 1 - i) % 2 === 0 ? p.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Stacked article (gray) over event (white) columns for the evolution card. */
function EvolutionColumns({
  item,
  event,
  wide,
  maxH,
}: {
  item: VizItem
  event: NewsEvent
  wide: boolean
  /** Detail cards cap the chart so the body copy below keeps its room. */
  maxH?: number
}) {
  const arts = weekSeries(event)
  const evs = eventWeekSeries(event)
  const w = Math.max(wide ? item.w * 0.48 : item.w - PAD * 2, 100)
  const h = Math.min(Math.max(item.h - PAD * 2 - LABEL_H - 22, 40), maxH ?? Infinity)
  const max = Math.max(...arts.map((p) => p.value))
  const evMax = Math.max(...evs.map((p) => p.value))
  const gap = 8
  const barW = (w - gap * (arts.length - 1)) / arts.length
  return (
    <div className="viz-minichart viz-evolution-chart" style={{ width: w }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        {arts.map((p, i) => {
          const artH = Math.max((p.value / max) * (h - 4), 4)
          const evH = Math.max((evs[i].value / evMax) * artH * 0.42, 2)
          const x = r2(i * (barW + gap))
          return (
            <g key={i}>
              <rect
                x={x}
                y={r2(h - artH)}
                width={r2(barW)}
                height={r2(artH - evH - 1)}
                rx={1.5}
                fill={p.today ? 'var(--chart-mid)' : 'var(--chart-dim)'}
              />
              <rect
                x={x}
                y={r2(h - evH)}
                width={r2(barW)}
                height={r2(evH)}
                rx={1.5}
                fill="var(--chart-fg)"
              />
            </g>
          )
        })}
      </svg>
      <div className="viz-minichart-axis">
        {arts.map((p, i) => (
          <span key={i} style={{ width: barW + (i < arts.length - 1 ? gap : 0) }}>
            {(arts.length - 1 - i) % 2 === 0 ? p.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Green/gray/red stacked daily sentiment columns. */
function SentimentColumns({ item, event }: { item: VizItem; event: NewsEvent }) {
  const days = sentimentSeries(event)
  const w = Math.min(Math.max(item.w * 0.42, 140), 260)
  const h = Math.max(item.h - PAD * 2 - LABEL_H - 14, 40)
  const gap = 7
  const barW = (w - gap * (days.length - 1)) / days.length
  const seg = 1.5
  return (
    <div className="viz-minichart" style={{ width: w }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        {days.map((d, i) => {
          const x = r2(i * (barW + gap))
          const posH = d.positive * (h - seg * 2)
          const neuH = d.neutral * (h - seg * 2)
          const negH = d.negative * (h - seg * 2)
          return (
            <g key={i}>
              <rect x={x} y={0} width={r2(barW)} height={r2(posH)} rx={1.5} fill="var(--pos)" />
              <rect
                x={x}
                y={r2(posH + seg)}
                width={r2(barW)}
                height={r2(neuH)}
                rx={1.5}
                fill="var(--chart-dim)"
              />
              <rect
                x={x}
                y={r2(posH + seg + neuH + seg)}
                width={r2(barW)}
                height={r2(negH)}
                rx={1.5}
                fill="var(--neg)"
              />
            </g>
          )
        })}
      </svg>
      <div className="viz-minichart-axis">
        {days.map((d, i) => (
          <span key={i} style={{ width: barW + (i < days.length - 1 ? gap : 0) }}>
            {(days.length - 1 - i) % 2 === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}
