/** Inline volume sparkline. Inherits color from `currentColor`. */

type SparklineProps = {
  values: number[]
  width: number
  height: number
  className?: string
  /** Fill under the line, at low opacity. */
  area?: boolean
  strokeWidth?: number
  /** Smooth the points into a compact Catmull–Rom curve. */
  curve?: boolean
}

export function Sparkline({
  values,
  width,
  height,
  className,
  area = false,
  strokeWidth = 1.75,
  curve = false,
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

  const line = curve ? curvedPath(points, height) : points
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

function curvedPath(points: { x: number; y: number }[], height: number): string {
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[index - 1] ?? points[index]
    const start = points[index]
    const end = points[index + 1]
    const after = points[index + 2] ?? end
    const controlOne = {
      x: start.x + (end.x - before.x) / 6,
      y: Math.max(0, Math.min(height, start.y + (end.y - before.y) / 6)),
    }
    const controlTwo = {
      x: end.x - (after.x - start.x) / 6,
      y: Math.max(0, Math.min(height, end.y - (after.y - start.y) / 6)),
    }
    path += ` C ${round(controlOne.x)} ${round(controlOne.y)}, ${round(controlTwo.x)} ${round(controlTwo.y)}, ${round(end.x)} ${round(end.y)}`
  }
  return path
}
