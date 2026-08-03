/**
 * One trending or suggested event.
 *
 * `chip` is the resting presentation under the composer; `row` is the ranked
 * search result once the user types.
 */

import type { NewsEvent } from '../../news/events'
import { sparkValues } from '../../news/series'
import { Sparkline } from '../Sparkline'

export type EventCardSize = 'chip' | 'row'

type EventCardProps = {
  event: NewsEvent
  size: EventCardSize
  rank: number
  active: boolean
  onPick: (event: NewsEvent, rect: DOMRect) => void
  onHover: () => void
}

export function EventCard({ event, size, rank, active, onPick, onHover }: EventCardProps) {
  const className = [
    'event-card',
    `is-${size}`,
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const pick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onPick(event, e.currentTarget.getBoundingClientRect())
  }

  return (
    <button
      type="button"
      id={`event-opt-${event.id}`}
      role="option"
      aria-selected={active}
      aria-label={`${event.title} — ${event.category}, ${event.articleCount.toLocaleString()} articles`}
      tabIndex={-1}
      className={className}
      data-testid="event-card"
      onClick={pick}
      onMouseEnter={onHover}
    >
      {size === 'chip' ? (
        <>
          <span className="event-card-name">{event.title}</span>
          <span className="event-card-count">{compact(event.articleCount)}</span>
        </>
      ) : (
        <>
          <span className="event-card-eyebrow">
            <span className="event-card-rank">{pad2(rank)}</span>
            <span>{event.region}</span>
            <span className="event-card-dot">·</span>
            <span>{event.category}</span>
          </span>
          <span className="event-card-name">{event.title}</span>
          <span className="event-card-summary">{event.summary}</span>
          <Sparkline
            className="event-card-spark"
            values={sparkValues(event, 12)}
            width={56}
            height={16}
          />
          <span className="event-card-meta">
            {event.articleCount.toLocaleString()} articles
            <span className="event-card-dot">·</span>
            {event.sourceCount} outlets
          </span>
        </>
      )}
    </button>
  )
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** 4820 -> "4.8k" — chips have no room for the full number. */
function compact(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
}
