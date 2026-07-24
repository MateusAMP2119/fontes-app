import type { ChartKind } from '../items/items'

/**
 * Placeholder sketch for a visualization kind — drawn on catalog tiles and
 * on canvas chart placeholders. Pure shape, colored via currentColor.
 */
export function VizSketch({ kind, className }: { kind: ChartKind; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 34 26" aria-hidden="true">
      {sketchBody(kind)}
    </svg>
  )
}

function sketchBody(kind: ChartKind) {
  switch (kind) {
    case 'bar':
      return (
        <>
          <rect x="2" y="14" width="5" height="9" rx="1" fill="currentColor" />
          <rect x="10" y="6" width="5" height="17" rx="1" fill="currentColor" />
          <rect x="18" y="10" width="5" height="13" rx="1" fill="currentColor" />
          <rect x="26" y="16" width="5" height="7" rx="1" fill="currentColor" />
        </>
      )
    case 'line':
      return (
        <path
          d="M2 20 L10 11 L17 15 L25 5 L32 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    case 'area':
      return (
        <>
          <path d="M2 22 L2 15 L11 9 L19 13 L31 5 L31 22 Z" fill="currentColor" opacity="0.4" />
          <path
            d="M2 15 L11 9 L19 13 L31 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
    case 'pie':
      return (
        <>
          <circle cx="17" cy="13" r="9" fill="currentColor" opacity="0.35" />
          <path d="M17 13 L17 4 A9 9 0 0 1 25.5 16 Z" fill="currentColor" />
        </>
      )
    case 'donut':
      return (
        <>
          <circle
            cx="17"
            cy="13"
            r="7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            opacity="0.35"
          />
          <path
            d="M17 5.5 A7.5 7.5 0 0 1 24.2 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )
    case 'scatter':
      return (
        <>
          <circle cx="6" cy="18" r="2" fill="currentColor" />
          <circle cx="12" cy="10" r="2" fill="currentColor" />
          <circle cx="18" cy="14" r="2" fill="currentColor" />
          <circle cx="23" cy="6" r="2" fill="currentColor" />
          <circle cx="28" cy="11" r="2" fill="currentColor" />
          <circle cx="15" cy="20" r="2" fill="currentColor" opacity="0.5" />
        </>
      )
    case 'heat':
      return (
        <>
          <rect x="3" y="4" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.35" />
          <rect x="13" y="4" width="8" height="8" rx="1.5" fill="currentColor" />
          <rect x="23" y="4" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.6" />
          <rect x="3" y="14" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.8" />
          <rect x="13" y="14" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.25" />
          <rect x="23" y="14" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.5" />
        </>
      )
    case 'stat':
      return (
        <>
          <rect x="4" y="6" width="16" height="6" rx="2" fill="currentColor" />
          <rect x="4" y="16" width="26" height="4" rx="2" fill="currentColor" opacity="0.4" />
        </>
      )
    case 'table':
      return (
        <>
          <rect
            x="3"
            y="4"
            width="28"
            height="18"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M3 10 H31 M3 16 H31 M13 4 V22" stroke="currentColor" strokeWidth="1.8" />
        </>
      )
    case 'map':
      return (
        <>
          <path
            d="M4 7 L12 4 L22 7 L30 4 L30 19 L22 22 L12 19 L4 22 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="17" cy="12" r="2.2" fill="currentColor" />
        </>
      )
    case 'flow':
      return (
        <>
          <rect x="3" y="4" width="4" height="18" rx="1.5" fill="currentColor" />
          <rect x="27" y="7" width="4" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
          <rect x="27" y="16" width="4" height="4" rx="1.5" fill="currentColor" opacity="0.45" />
          <path d="M7 8 C 17 8, 17 9.5, 27 9.5" stroke="currentColor" strokeWidth="2.4" fill="none" opacity="0.5" />
          <path d="M7 18 C 17 18, 17 17.5, 27 17.5" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.35" />
        </>
      )
  }
}
