/**
 * The empty board's resting content: a prompt composer that spawns a
 * dashboard for a news event.
 *
 * Lives inside .frame-pc rather than floating over it — the frame is the
 * dashboard target, so pick→build is a content swap in a rectangle that
 * never moves. Focus stays in the input the whole time; the result list is
 * driven by aria-activedescendant.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EVENT_CATEGORIES,
  NEWS_EVENTS,
  searchEvents,
  type EventCategory,
  type NewsEvent,
} from '../../news/events'
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  matchesFilters,
  REGION_OPTIONS,
  TIME_OPTIONS,
  TONE_OPTIONS,
  type Filters,
} from '../../news/filters'
import { IconArrowUp } from '../icons'
import { EventCard } from './EventCard'

type Scope = 'All' | EventCategory

const SCOPES: Scope[] = ['All', ...EVENT_CATEGORIES]

type TopicComposerProps = {
  query: string
  onQueryChange: (query: string) => void
  onPick: (event: NewsEvent, from: DOMRect) => void
  /** A build is in flight — wipe out while the ghost grows into the frame. */
  leaving: boolean
}

export function TopicComposer({
  query,
  onQueryChange,
  onPick,
  leaving,
}: TopicComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [scope, setScope] = useState<Scope>('All')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  /** -1 is "nothing chosen yet" — trending rests unhighlighted. */
  const [activeIndex, setActiveIndex] = useState(-1)

  const searching = query.trim().length > 0

  // Narrow first, then rank. searchEvents falls back to hottest-first on an
  // empty query, so trending and search results come off the same pool.
  const results = useMemo(() => {
    const pool = NEWS_EVENTS.filter(
      (e) => (scope === 'All' || e.category === scope) && matchesFilters(e, filters),
    )
    return searchEvents(query, pool)
  }, [query, scope, filters])

  const filterCount = activeFilterCount(filters)

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  // The board is empty and picking is the only available act.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // A search pre-selects its top hit so Enter builds it; trending does not,
  // since nothing there has been chosen.
  useEffect(() => {
    setActiveIndex(searching ? 0 : -1)
  }, [query, scope, filters, searching])

  const active = results[activeIndex]

  /** Keyboard picks have no click target — read the rect off the option. */
  const pickActive = () => {
    if (!active) return
    const el = document.getElementById(`event-opt-${active.id}`)
    const rect = el?.getBoundingClientRect()
    if (rect) onPick(active, rect)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escape deliberately falls through to the app's global cascade.
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pickActive()
    }
  }

  const chooseScope = (next: Scope) => {
    setScope(next)
    inputRef.current?.focus()
  }

  return (
    <div
      className={`spawn${leaving ? ' is-leaving' : ''}`}
      data-testid="topic-composer"
      inert={leaving}
    >
      <div className="spawn-stack">
        <div className="spawn-composer">
          <input
            ref={inputRef}
            type="text"
            className="spawn-input"
            data-testid="composer-input"
            value={query}
            placeholder="Follow any story…"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="spawn-results"
            aria-activedescendant={active ? `event-opt-${active.id}` : undefined}
            aria-label="Search news events"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className="spawn-send"
            title="Build this view"
            data-testid="composer-send"
            disabled={!active}
            onClick={pickActive}
          >
            <IconArrowUp size={17} />
            <span className="sr-only">Build this view</span>
          </button>
        </div>

        {/* Every control here narrows both trending and search results */}
        <div className="spawn-controls">
          <div className="spawn-scopes" role="group" aria-label="Filter by category">
            {SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                className={`spawn-chip${s === scope ? ' is-on' : ''}`}
                aria-pressed={s === scope}
                onClick={() => chooseScope(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="spawn-filters">
            <FilterSelect
              label="Region"
              value={filters.region}
              options={REGION_OPTIONS}
              onChange={(v) => setFilter('region', v)}
            />
            <FilterSelect
              label="Time"
              value={filters.window}
              options={TIME_OPTIONS}
              onChange={(v) => setFilter('window', v)}
            />
            <FilterSelect
              label="Tone"
              value={filters.tone}
              options={TONE_OPTIONS}
              onChange={(v) => setFilter('tone', v)}
            />
            {filterCount > 0 && (
              <button
                type="button"
                className="spawn-clear"
                data-testid="clear-filters"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS)
                  inputRef.current?.focus()
                }}
              >
                Clear {filterCount}
              </button>
            )}
          </div>
        </div>

        {/* Keyed by mode so switching remounts and replays the CSS fade */}
        <div
          className="spawn-suggest"
          id="spawn-results"
          role="listbox"
          aria-label={searching ? 'Matching stories' : 'Trending stories'}
          data-testid="composer-suggest"
        >
          {results.length === 0 ? (
            <div key="empty" className="spawn-swap spawn-empty">
              {searching
                ? `No story matches “${query.trim()}”`
                : 'No story matches these filters'}
            </div>
          ) : searching ? (
            <div key="results" className="spawn-swap spawn-rows">
              {results.slice(0, 6).map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  size="row"
                  rank={i + 1}
                  active={i === activeIndex}
                  onPick={onPick}
                  onHover={() => setActiveIndex(i)}
                />
              ))}
            </div>
          ) : (
            <div key="resting" className="spawn-swap spawn-resting">
              <span className="spawn-suggest-head">Trending now</span>
              <div className="spawn-chips">
                {results.map((event, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    size="chip"
                    rank={i + 1}
                    active={i === activeIndex}
                    onPick={onPick}
                    onHover={() => setActiveIndex(i)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * A native select wearing the chip look. Native keeps keyboard and screen
 * reader behaviour for free — a custom popover would be a lot of surface for
 * three one-of-N choices.
 */
function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const isDefault = value === options[0].value
  return (
    <label className={`spawn-select${isDefault ? '' : ' is-on'}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        data-testid={`filter-${label.toLowerCase()}`}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
