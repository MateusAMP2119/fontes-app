import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import {
  audienceInterestProfile,
  audienceInterestSummary,
  reachKpi,
  type ReachProfilePoint,
} from '../../../../news/series'
import { bodyH, cardColumns, GUTTER, PAD, r2 } from '../../shared/charts'
import { Shell } from '../../shared/Shell'
import { variantFor } from '../../shared/variant'
import sh from '../../shared/shared.module.css'
import s from './ReachCard.module.css'

const THRESHOLDS = { minAspect: 1.65, minW: 280, detailMinH: 140 }

export function ReachCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const variant = variantFor(item, THRESHOLDS)
  const horizontal = variant === 'horizontal'
  const detail = variant === 'detail'
  const stat = reachKpi(event)
  const cols = horizontal ? cardColumns(item) : undefined
  const profile = audienceInterestProfile(event)
  const expandedStory = bodyH(item) >= 130 || cols?.n === 3
  const summary = audienceInterestSummary(event, !expandedStory)
  const metric = (
    <div className={horizontal ? `${sh.kpiMain} ${sh.metricColumn}` : sh.kpiMain}>
      <span className={`${sh.number} ${s.number}`}>{stat.value}</span>
      <p className={`${s.audienceSummary} ${expandedStory ? s.expandedStory : ''}`}>
        {summary}
      </p>
    </div>
  )
  return (
    <Shell label="Alcance estimado" variant={variant} columns={cols} className={s.root}>
      {detail ? (
        <div className={s.detailWrap}>
          {metric}
          <ReachRadar
            width={item.w - 2 - PAD * 2}
            height={Math.max(bodyH(item) - 168, 125)}
            points={profile}
          />
        </div>
      ) : (
        <div className={sh.kpiRow}>
          {metric}
          {horizontal && cols && (
            <div className={`${sh.visualColumn} ${cols.n === 3 ? s.visualWide : ''}`}>
              <ReachRadar
                width={cols.n === 3 ? cols.colW * 2 + GUTTER : cols.colW}
                height={Math.max(bodyH(item), 56)}
                points={profile}
              />
            </div>
          )}
        </div>
      )}
    </Shell>
  )
}

/** Relative interest across the three audience clusters most relevant to the topic. */
function ReachRadar({
  width,
  height,
  points,
}: {
  width: number
  height: number
  points: ReachProfilePoint[]
}) {
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width * 0.3, height * 0.41)
  const pointAt = (i: number, distance: number) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / points.length
    return { x: r2(cx + Math.cos(angle) * distance), y: r2(cy + Math.sin(angle) * distance) }
  }
  const polygon = (scale: number) =>
    points.map((_, i) => {
      const point = pointAt(i, radius * scale)
      return `${point.x},${point.y}`
    }).join(' ')
  const profile = points.map((point, i) => {
    const position = pointAt(i, radius * (point.value / 100))
    return `${position.x},${position.y}`
  }).join(' ')
  const description = points.map((point) => `${point.label} ${point.value}`).join(', ')

  return (
    <svg
      className={s.radar}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Interesse estimado por grupo, índices de zero a cem: ${description}`}
    >
      {[0.33, 0.66, 1].map((scale) => (
        <polygon key={scale} className={s.radarGrid} points={polygon(scale)} />
      ))}
      {points.map((point, i) => {
        const edge = pointAt(i, radius)
        const label = pointAt(i, radius + 6)
        const fontSize = width < 180 ? 6.25 : width < 260 ? 7.25 : 9
        const lines = wrapRadarLabel(point.label, width < 180 ? 11 : width < 260 ? 16 : 20)
        const lineHeight = fontSize + 1.5
        const moveTopLabelAside = points.length === 3 && i === 0 && lines.length > 1
        const desiredX = moveTopLabelAside ? edge.x - 9 : label.x
        const desiredY = moveTopLabelAside ? edge.y + fontSize : label.y
        const dx = desiredX - cx
        const anchor = moveTopLabelAside ? 'end' : dx < -4 ? 'end' : dx > 4 ? 'start' : 'middle'
        const estimatedWidth = Math.max(...lines.map((line) => line.length)) * fontSize * 0.54
        const labelX = anchor === 'start'
          ? Math.min(desiredX, width - estimatedWidth - 1)
          : anchor === 'end'
            ? Math.max(desiredX, estimatedWidth + 1)
            : desiredX
        const blockHeight = (lines.length - 1) * lineHeight
        const labelY = Math.min(
          Math.max(desiredY + 2.5 - blockHeight / 2, fontSize),
          height - blockHeight - 1,
        )
        return (
          <g key={point.label}>
            <line className={s.radarAxis} x1={cx} y1={cy} x2={edge.x} y2={edge.y} />
            <text
              className={s.radarLabel}
              x={labelX}
              y={labelY}
              textAnchor={anchor}
              style={{ fontSize }}
            >
              {lines.map((line, lineIndex) => (
                <tspan key={line} x={labelX} dy={lineIndex === 0 ? 0 : lineHeight}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}
      <polygon className={s.radarShape} points={profile} />
      {points.map((point, i) => {
        const position = pointAt(i, radius * (point.value / 100))
        return <circle key={point.label} className={s.radarPoint} cx={position.x} cy={position.y} r={1.7} />
      })}
    </svg>
  )
}

function wrapRadarLabel(label: string, maxChars: number): string[] {
  const words = `${label[0].toUpperCase()}${label.slice(1)}`.split(' ')
  return words.reduce<string[]>((lines, word) => {
    const last = lines[lines.length - 1]
    if (!last || `${last} ${word}`.length > maxChars) lines.push(word)
    else lines[lines.length - 1] = `${last} ${word}`
    return lines
  }, [])
}
