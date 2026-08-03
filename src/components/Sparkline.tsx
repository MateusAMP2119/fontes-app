/** Inline volume sparkline. Inherits color from `currentColor`. */

type SparklineProps = {
  values: number[]
  width: number
  height: number
  className?: string
  /** Fill under the line, at low opacity. */
  area?: boolean
  strokeWidth?: number
}

export function Sparkline({
  values,
  width,
  height,
  className,
  area = false,
  strokeWidth = 1.75,
}: SparklineProps) {
  if (values.length < 2) return null

  const pad = strokeWidth
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(max - min, 1)
  const stepX = (width - pad * 2) / (values.length - 1)
  const usableH = height - pad * 2

  const points = values.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + usableH - ((v - min) / span) * usableH,
  }))

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`)
    .join(' ')

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {area && (
        <path
          d={`${line} L ${round(points[points.length - 1].x)} ${height} L ${round(points[0].x)} ${height} Z`}
          fill="currentColor"
          opacity={0.12}
        />
      )}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
