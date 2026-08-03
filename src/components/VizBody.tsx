/**
 * Widget bodies. Placeholders with plausible data, not a chart library.
 *
 * Every number comes from the seeded generators in src/news/series, keyed on
 * the item's eventId + metric, so a widget renders identically forever.
 * The SVG viewBox is derived arithmetically from the item's own w/h minus the
 * chrome paddings below — no measurement, and stroke weights stay honest.
 */

import type { VizItem } from '../items/items'
import { findEvent, type NewsEvent } from '../news/events'
import {
  angleSplit,
  daysBetween,
  kpi,
  peakPoint,
  shortDate,
  sourceBreakdown,
  sparkValues,
  toneSplit,
  volumeSeries,
} from '../news/series'
import { Sparkline } from './Sparkline'

/** Mirrors the .item-viz-* padding in App.css. */
const PAD_X = 14
const HEADER_H = 34
const PAD_BOTTOM = 14

export function VizBody({ item }: { item: VizItem }) {
  const event = findEvent(item.eventId)
  if (!event) {
    return <div className="item-viz-missing">Topic unavailable</div>
  }

  if (item.kind === 'header') return <HeaderBody item={item} event={event} />
  if (item.kind === 'stat') return <StatBody item={item} event={event} />

  const slotW = Math.max(item.w - PAD_X * 2, 40)
  const slotH = Math.max(item.h - HEADER_H - PAD_BOTTOM, 32)

  return (
    <div className="item-viz-body">
      <div className="item-viz-header">
        <span className="item-viz-title">{item.title}</span>
        <span className="item-viz-meta">{metaFor(item, event)}</span>
      </div>
      <div className="item-viz-slot">
        {renderSlot(item, event, slotW, slotH)}
      </div>
    </div>
  )
}

function renderSlot(item: VizItem, event: NewsEvent, w: number, h: number) {
  switch (item.kind) {
    case 'line':
    case 'area':
      return <TrendChart event={event} w={w} h={h} filled={item.kind === 'area'} />
    case 'bar':
      return <SourceBars event={event} h={h} />
    case 'donut':
      return <AngleDonut event={event} w={w} h={h} />
    case 'headlines':
      return <HeadlineList event={event} h={h} />
    default:
      return null
  }
}

function metaFor(item: VizItem, event: NewsEvent): string {
  switch (item.kind) {
    case 'line':
    case 'area':
      return `${event.windowDays} days`
    case 'bar':
      return `${event.sourceCount.toLocaleString()} outlets`
    case 'donut':
      return `${event.angles.length} threads`
    case 'headlines': {
      const slotH = Math.max(item.h - HEADER_H - PAD_BOTTOM, 32)
      const shown = Math.min(
        event.headlines.length,
        Math.max(Math.floor(slotH / HEADLINE_ROW_H), 1),
      )
      return `${shown} of ${event.articleCount.toLocaleString()}`
    }
    default:
      return ''
  }
}

/* —— header —— */

function HeaderBody({ item, event }: { item: VizItem; event: NewsEvent }) {
  const last = event.headlines[event.headlines.length - 1]
  const range = `${shortDate(event.startedAt)} – ${shortDate(last?.date ?? event.startedAt)}`
  return (
    <div className="item-viz-body item-viz-headerbody">
      <span className="item-viz-eyebrow">{event.category}</span>
      <span className="item-viz-headline">{item.title}</span>
      <span className="item-viz-summary">{event.summary}</span>
      <div className="item-viz-chips">
        <span className="item-viz-chip">{event.region}</span>
        <span className="item-viz-chip">{range}</span>
        <span className="item-viz-chip">{event.sourceCount.toLocaleString()} outlets</span>
      </div>
    </div>
  )
}

/* —— stat —— */

function StatBody({ item, event }: { item: VizItem; event: NewsEvent }) {
  const stat = kpi(event, item.metric)
  const showTone = item.metric === 'tone'
  return (
    <div className="item-viz-body item-viz-statbody">
      <span className="item-viz-statlabel">{item.title}</span>
      <span className="item-viz-statvalue">{stat.value}</span>
      <div className="item-viz-statfoot">
        <span className="item-viz-statcaption">{stat.caption}</span>
        {stat.delta !== null && (
          <span className={`item-viz-delta${stat.delta < 0 ? ' is-down' : ''}`}>
            {stat.delta < 0 ? '▾' : '▴'} {Math.abs(stat.delta).toFixed(1)}%
          </span>
        )}
      </div>
      {showTone ? (
        <ToneBar event={event} />
      ) : (
        <Sparkline
          className="item-viz-spark"
          values={sparkValues(event, 14)}
          width={64}
          height={16}
        />
      )}
    </div>
  )
}

function ToneBar({ event }: { event: NewsEvent }) {
  const tone = toneSplit(event)
  return (
    <div className="item-viz-tonebar">
      {tone.map((slice, i) => (
        <span
          key={slice.label}
          className="item-viz-toneseg"
          style={{ flexGrow: slice.value, opacity: 1 - i * 0.3 }}
          title={`${slice.label} ${Math.round(slice.value * 100)}%`}
        />
      ))}
    </div>
  )
}

/* —— trend —— */

function TrendChart({
  event,
  w,
  h,
  filled,
}: {
  event: NewsEvent
  w: number
  h: number
  filled: boolean
}) {
  const series = volumeSeries(event)
  const axisH = 14
  const chartH = Math.max(h - axisH, 20)
  const max = Math.max(...series.map((p) => p.value))
  const stepX = series.length > 1 ? w / (series.length - 1) : w
  const points = series.map((p, i) => ({
    x: i * stepX,
    y: chartH - (p.value / max) * (chartH - 6) - 2,
    value: p.value,
  }))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${r2(p.x)} ${r2(p.y)}`).join(' ')
  const peak = peakPoint(event)
  const peakIndex = series.findIndex((p) => p.day === peak.day)
  const peakPt = points[peakIndex] ?? points[0]

  return (
    <div className="item-viz-chart">
      <svg viewBox={`0 0 ${w} ${chartH}`} width={w} height={chartH} aria-hidden="true">
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={w}
            y1={r2(chartH * f)}
            y2={r2(chartH * f)}
            stroke="var(--surface-border)"
            strokeWidth={1}
          />
        ))}
        {filled && (
          <path
            d={`${line} L ${r2(w)} ${chartH} L 0 ${chartH} Z`}
            fill="var(--accent)"
            opacity={0.14}
          />
        )}
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={r2(peakPt.x)} cy={r2(peakPt.y)} r={3} fill="var(--accent)" />
      </svg>
      <div className="item-viz-axis">
        <span>{shortDate(series[0].day)}</span>
        <span className="item-viz-axis-peak">
          peak {shortDate(peak.day)} · {peak.value.toLocaleString()}
        </span>
        <span>{shortDate(series[series.length - 1].day)}</span>
      </div>
    </div>
  )
}

/* —— bars —— */

function SourceBars({ event, h }: { event: NewsEvent; h: number }) {
  const rows = sourceBreakdown(event)
  const visible = rows.slice(0, Math.max(Math.floor(h / 26), 2))
  const max = visible[0]?.value ?? 1
  return (
    <div className="item-viz-bars">
      {visible.map((row) => (
        <div key={row.label} className="item-viz-bar">
          <span className="item-viz-bar-label">{row.label}</span>
          <span className="item-viz-bar-track">
            <span
              className="item-viz-bar-fill"
              style={{ width: `${Math.max((row.value / max) * 100, 3)}%` }}
            />
          </span>
          <span className="item-viz-bar-value">{row.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

/* —— donut —— */

function AngleDonut({ event, w, h }: { event: NewsEvent; w: number; h: number }) {
  const slices = angleSplit(event)
  const showLegend = w > 230
  const size = Math.min(showLegend ? w * 0.46 : w, h)
  const stroke = Math.max(size * 0.17, 9)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const top = slices[0]

  let offset = 0
  return (
    <div className="item-viz-donut">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <g transform={`rotate(-90 ${r2(center)} ${r2(center)})`}>
          {slices.map((slice, i) => {
            const dash = slice.value * circumference
            const el = (
              <circle
                key={slice.label}
                cx={r2(center)}
                cy={r2(center)}
                r={r2(radius)}
                fill="none"
                stroke="var(--accent)"
                strokeOpacity={1 - i * 0.24}
                strokeWidth={r2(stroke)}
                strokeDasharray={`${r2(dash)} ${r2(circumference)}`}
                strokeDashoffset={r2(-offset)}
              />
            )
            offset += dash
            return el
          })}
        </g>
        <text
          x={r2(center)}
          y={r2(center)}
          textAnchor="middle"
          dominantBaseline="central"
          className="item-viz-donut-value"
        >
          {Math.round(top.value * 100)}%
        </text>
      </svg>
      {showLegend && (
        <ul className="item-viz-legend">
          {slices.map((slice, i) => (
            <li key={slice.label}>
              <span className="item-viz-swatch" style={{ opacity: 1 - i * 0.24 }} />
              <span className="item-viz-legend-name">{slice.label}</span>
              <span className="item-viz-legend-value">{Math.round(slice.value * 100)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* —— headlines —— */

/** Tallest a row gets: two clamped title lines, the meta line, and padding. */
const HEADLINE_ROW_H = 50

function HeadlineList({ event, h }: { event: NewsEvent; h: number }) {
  const visible = event.headlines.slice(0, Math.max(Math.floor(h / HEADLINE_ROW_H), 1))
  return (
    <ul className="item-viz-headlines">
      {visible.map((headline) => {
        const day = daysBetween(event.startedAt, headline.date)
        return (
          <li key={headline.title}>
            <span className="item-viz-headline-title">{headline.title}</span>
            <span className="item-viz-headline-meta">
              {headline.source} · {day === 0 ? 'day one' : `day ${day + 1}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}
