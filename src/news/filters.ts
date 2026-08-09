/**
 * Cross-cutting filters for the topic picker: recency, geography, tone.
 *
 * Recency is measured against the newest story in the fixture set, not the
 * wall clock. The fixtures are static, so anchoring to `Date.now()` would
 * quietly empty every time window once the dates aged out.
 */

import { NEWS_EVENTS, type NewsEvent, type Region } from './events'
import { addDays, daysBetween, sentimentScore } from './series'

export type RegionFilter = 'any' | Region
export type TimeWindow = 'any' | '7' | '14' | '30'
export type ToneBand = 'any' | 'positive' | 'neutral' | 'negative'

export type Filters = {
  region: RegionFilter
  window: TimeWindow
  tone: ToneBand
}

export const DEFAULT_FILTERS: Filters = {
  region: 'any',
  window: 'any',
  tone: 'any',
}

/** Last day of coverage across every fixture — "now" for this dataset. */
export const NEWS_NOW: string = NEWS_EVENTS.reduce((latest, e) => {
  const end = addDays(e.startedAt, e.windowDays - 1)
  return end > latest ? end : latest
}, NEWS_EVENTS[0].startedAt)

export const REGION_OPTIONS: { value: RegionFilter; label: string }[] = [
  { value: 'any', label: 'Qualquer região' },
  { value: 'Global', label: 'Global' },
  { value: 'Europe', label: 'Europa' },
  { value: 'Americas', label: 'Américas' },
  { value: 'Asia', label: 'Ásia' },
  { value: 'Africa', label: 'África' },
  { value: 'Middle East', label: 'Médio Oriente' },
]

export const TIME_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: 'any', label: 'Qualquer altura' },
  { value: '7', label: 'Última semana' },
  { value: '14', label: 'Últimas duas semanas' },
  { value: '30', label: 'Último mês' },
]

/** Bands over the net tone score; the dead zone keeps "neutral" meaningful. */
const TONE_EDGE = 0.12

export const TONE_OPTIONS: { value: ToneBand; label: string }[] = [
  { value: 'any', label: 'Qualquer tom' },
  { value: 'positive', label: 'Positivo' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'negative', label: 'Negativo' },
]

export function toneBandOf(event: NewsEvent): Exclude<ToneBand, 'any'> {
  const score = sentimentScore(event)
  if (score > TONE_EDGE) return 'positive'
  if (score < -TONE_EDGE) return 'negative'
  return 'neutral'
}

export function matchesFilters(event: NewsEvent, filters: Filters): boolean {
  if (filters.region !== 'any' && event.region !== filters.region) return false
  if (filters.tone !== 'any' && toneBandOf(event) !== filters.tone) return false
  if (filters.window !== 'any') {
    const age = daysBetween(event.startedAt, NEWS_NOW)
    if (age > Number(filters.window)) return false
  }
  return true
}

export function activeFilterCount(filters: Filters): number {
  return (Object.keys(filters) as (keyof Filters)[]).filter(
    (k) => filters[k] !== DEFAULT_FILTERS[k],
  ).length
}
