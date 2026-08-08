/**
 * Deterministic mock data derived from a NewsEvent.
 *
 * Nothing here is stored: every series is a pure function of
 * (event id, metric), so it is identical across re-renders, board switches
 * and page reloads. Never seed from an item id — nextItemId() uses
 * Math.random(), so item ids differ every run and the data would drift.
 */

import type { EventCategory, NewsEvent, Sentiment } from './events'

export type Slice = { label: string; value: number }
export type SeriesPoint = { day: string; value: number }

/** FNV-1a — string to 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, good enough for plausible-looking noise. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rngFor(eventId: string, metric: string): () => number {
  return mulberry32(hashSeed(`${eventId}:${metric}`))
}

/** Referential stability too, so results survive memoized renderers. */
const cache = new Map<string, unknown>()

function memo<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key) as T
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** YYYY-MM-DD plus n days, computed entirely in UTC. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 2026-06-13 -> "Jun 13". */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

/** Whole days between two ISO dates, UTC. */
export function daysBetween(from: string, to: string): number {
  const [ay, am, ad] = from.split('-').map(Number)
  const [by, bm, bd] = to.split('-').map(Number)
  const a = Date.UTC(ay, am - 1, ad)
  const b = Date.UTC(by, bm - 1, bd)
  return Math.round((b - a) / 86400000)
}

/**
 * Daily article volume: a gaussian spike a day or three in, a long decay,
 * and jitter. Normalized so the series sums to the fixture's articleCount —
 * the KPI and the chart must agree.
 */
export function volumeSeries(ev: NewsEvent): SeriesPoint[] {
  return memo(`${ev.id}:volume`, () => {
    const rnd = rngFor(ev.id, 'volume')
    const n = ev.windowDays
    const peak = 1 + Math.floor(rnd() * 3)
    const sigma = Math.max(n / 4, 1)
    const raw = Array.from({ length: n }, (_, i) => {
      const t = i - peak
      const spike = Math.exp(-(t * t) / (2 * sigma * sigma))
      const tail = i > peak ? Math.exp(-(i - peak) / (n / 2.2)) : 1
      return Math.max(spike * tail * (0.72 + rnd() * 0.56), 0.02)
    })
    const sum = raw.reduce((a, b) => a + b, 0)
    return raw.map((v, i) => ({
      day: addDays(ev.startedAt, i),
      value: Math.max(Math.round((v / sum) * ev.articleCount), 1),
    }))
  })
}

/** Index of the busiest day in the volume series. */
export function peakPoint(ev: NewsEvent): SeriesPoint {
  const series = volumeSeries(ev)
  return series.reduce((best, p) => (p.value > best.value ? p : best), series[0])
}

/** Zipf-ish outlet distribution, normalized to articleCount, descending. */
export function sourceBreakdown(ev: NewsEvent): Slice[] {
  return memo(`${ev.id}:sources`, () => {
    const rnd = rngFor(ev.id, 'sources')
    const weights = ev.sources.map((_, i) => (1 / (i + 0.6)) * (0.82 + rnd() * 0.36))
    const sum = weights.reduce((a, b) => a + b, 0)
    return ev.sources
      .map((label, i) => ({ label, value: Math.round((weights[i] / sum) * ev.articleCount) }))
      .sort((a, b) => b.value - a.value)
  })
}

const TONE_BASE: Record<Sentiment, [number, number, number]> = {
  positive: [0.52, 0.33, 0.15],
  neutral: [0.24, 0.55, 0.21],
  negative: [0.14, 0.31, 0.55],
  mixed: [0.36, 0.26, 0.38],
}

const TONE_LABELS = ['Positive', 'Neutral', 'Negative']

/** Positive / neutral / negative shares, jittered and renormalized to 1. */
export function toneSplit(ev: NewsEvent): Slice[] {
  return memo(`${ev.id}:tone`, () => {
    const rnd = rngFor(ev.id, 'tone')
    const raw = TONE_BASE[ev.sentiment].map((v) => Math.max(v + (rnd() - 0.5) * 0.1, 0.02))
    const sum = raw.reduce((a, b) => a + b, 0)
    return raw.map((v, i) => ({ label: TONE_LABELS[i], value: v / sum }))
  })
}

/** Share of coverage per story thread, normalized to 1, descending. */
export function angleSplit(ev: NewsEvent): Slice[] {
  return memo(`${ev.id}:angles`, () => {
    const rnd = rngFor(ev.id, 'angles')
    const weights = ev.angles.map((_, i) => (1 / (i + 0.8)) * (0.75 + rnd() * 0.5))
    const sum = weights.reduce((a, b) => a + b, 0)
    return ev.angles
      .map((label, i) => ({ label, value: weights[i] / sum }))
      .sort((a, b) => b.value - a.value)
  })
}

/**
 * Net tone, -1 (wholly negative) to 1 (wholly positive). Derived from the
 * generated split rather than the fixture's label, so the number a filter
 * matches on is the same number the Tone widget shows.
 */
export function sentimentScore(ev: NewsEvent): number {
  const [positive, , negative] = toneSplit(ev)
  return positive.value - negative.value
}

export type Kpi = { value: string; caption: string; delta: number | null }

/** Headline number for a stat widget, plus a period-over-period delta. */
export function kpi(ev: NewsEvent, metric: string): Kpi {
  return memo(`${ev.id}:kpi:${metric}`, () => {
    const rnd = rngFor(ev.id, `kpi:${metric}`)
    const delta = Math.round((rnd() * 90 - 26) * 10) / 10
    switch (metric) {
      case 'outlets':
        return { value: ev.sourceCount.toLocaleString(), caption: 'Outlets', delta }
      case 'peak': {
        const p = peakPoint(ev)
        return { value: shortDate(p.day), caption: `${p.value.toLocaleString()} articles`, delta: null }
      }
      case 'tone': {
        const tone = toneSplit(ev)
        const top = tone.reduce((best, s) => (s.value > best.value ? s : best), tone[0])
        return {
          value: `${Math.round(top.value * 100)}%`,
          caption: top.label.toLowerCase(),
          delta: null,
        }
      }
      default:
        return { value: ev.articleCount.toLocaleString(), caption: 'Articles', delta }
    }
  })
}

/** Short volume series for inline sparklines in the picker. */
export function sparkValues(ev: NewsEvent, count = 16): number[] {
  return memo(`${ev.id}:spark:${count}`, () => {
    const series = volumeSeries(ev)
    if (series.length <= count) return series.map((p) => p.value)
    const step = series.length / count
    return Array.from({ length: count }, (_, i) => series[Math.floor(i * step)].value)
  })
}

/* —— Figma widget data ————————————————————————————————————————————————— */

/** "14 m", "980 k", "312" — compact pt-style figure with a spaced unit. */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10} m`
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`
  return String(n)
}

export type EventsKpi = {
  /** Published events over the window — the big number. */
  events: number
  /** New events in the last 24h — the headline delta. */
  deltaEvents: number
  /** Articles in the last 24h — "189 artigos totais". */
  articles24h: number
  deltaArticles: number
}

/** "EVENTOS PUBLICADOS" — event counts derived from the article volume. */
export function eventsKpi(ev: NewsEvent): EventsKpi {
  return memo(`${ev.id}:eventsKpi`, () => {
    const rnd = rngFor(ev.id, 'eventsKpi')
    const perEvent = 8 + rnd() * 7
    const events = Math.max(Math.round(ev.articleCount / (perEvent * 10)), 3)
    const deltaEvents = Math.max(Math.round(events * (0.2 + rnd() * 0.5)), 1)
    const series = volumeSeries(ev)
    const articles24h = series[series.length - 1].value
    const deltaArticles = Math.max(Math.round(articles24h * (0.25 + rnd() * 0.4)), 1)
    return { events, deltaEvents, articles24h, deltaArticles }
  })
}

export type ReachKpi = { value: string; delta: number }

/** "ALCANCE ESTIMADO" — audience reach, articles × seeded multiplier. */
export function reachKpi(ev: NewsEvent): ReachKpi {
  return memo(`${ev.id}:reach`, () => {
    const rnd = rngFor(ev.id, 'reach')
    const perArticle = 2000 + rnd() * 7000
    const value = formatCompact(Math.round(ev.articleCount * perArticle))
    const delta = Math.max(Math.round(ev.articleCount * (0.2 + rnd() * 0.6)), 40)
    return { value, delta }
  })
}

/** "FONTES ATIVAS" delta — new outlets picked up over the last day. */
export function sourcesDelta(ev: NewsEvent): number {
  return memo(`${ev.id}:sourcesDelta`, () => {
    const rnd = rngFor(ev.id, 'sourcesDelta')
    return Math.max(Math.round(ev.sourceCount * (0.1 + rnd() * 0.5)), 1)
  })
}

const SEGMENTS: Record<string, string[]> = {
  World: ['Leitores internacionais', 'Adultos 25–44', 'Grande Lisboa'],
  Business: ['Executivos e gestão', 'Investidores particulares', 'PMEs'],
  Tech: ['Jovens em Fintech', 'Early adopters', 'Profissionais de TI'],
  Science: ['Comunidade académica', 'Adultos 25–44', 'Professores'],
  Climate: ['Jovens dos 18 aos 25', 'Ativistas locais', 'Área de Lisboa'],
  Sport: ['Adeptos 18–34', 'Público desportivo', 'Norte do país'],
  Culture: ['Público urbano', 'Estudantes', 'Leitores de fim de semana'],
}

/** The "Jovens em Fintech" sublabel under the reach figure. */
export function audienceSegment(ev: NewsEvent): string {
  return memo(`${ev.id}:segment`, () => {
    const rnd = rngFor(ev.id, 'segment')
    const pool = SEGMENTS[ev.category] ?? SEGMENTS.World
    return pool[Math.floor(rnd() * pool.length)]
  })
}

const WEEKDAYS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Weekday with its "em" contraction, for prose like "o pico foi na terça". */
const DAY_FULL: Record<string, string> = {
  dom: 'no domingo',
  seg: 'na segunda',
  ter: 'na terça',
  qua: 'na quarta',
  qui: 'na quinta',
  sex: 'na sexta',
  sáb: 'no sábado',
}

export type WeekPoint = { label: string; value: number; today: boolean }

/** Last seven days of volume, weekday-labelled, final bucket "hoje". */
export function weekSeries(ev: NewsEvent): WeekPoint[] {
  return memo(`${ev.id}:week`, () => {
    const series = volumeSeries(ev)
    const tail = series.slice(-7)
    return tail.map((p, i) => {
      const [y, m, d] = p.day.split('-').map(Number)
      const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
      const today = i === tail.length - 1
      return { label: today ? 'hoje' : WEEKDAYS_PT[weekday], value: p.value, today }
    })
  })
}

/** Events-per-day companion to weekSeries; sums drive the side stats. */
export function eventWeekSeries(ev: NewsEvent): WeekPoint[] {
  return memo(`${ev.id}:eventWeek`, () => {
    const rnd = rngFor(ev.id, 'eventWeek')
    return weekSeries(ev).map((p) => ({
      ...p,
      value: Math.max(Math.round(p.value / (8 + rnd() * 7)), 1),
    }))
  })
}

export type EvolutionStats = { articles: number; events: number; perEvent: number }

/** Side figures for the wide evolution card, computed from the same series. */
export function evolutionStats(ev: NewsEvent): EvolutionStats {
  return memo(`${ev.id}:evolutionStats`, () => {
    const articles = weekSeries(ev).reduce((a, p) => a + p.value, 0)
    const events = eventWeekSeries(ev).reduce((a, p) => a + p.value, 0)
    return { articles, events, perEvent: Math.max(Math.round(articles / events), 1) }
  })
}

export type SentimentDay = { label: string; positive: number; neutral: number; negative: number }

/** Daily positive/neutral/negative shares, jittered around toneSplit. */
export function sentimentSeries(ev: NewsEvent): SentimentDay[] {
  return memo(`${ev.id}:sentimentWeek`, () => {
    const rnd = rngFor(ev.id, 'sentimentWeek')
    const [pos, neu, neg] = toneSplit(ev)
    return weekSeries(ev).map((p) => {
      const raw = [pos.value, neu.value, neg.value].map((v) =>
        Math.max(v + (rnd() - 0.5) * 0.18, 0.04),
      )
      const sum = raw.reduce((a, b) => a + b, 0)
      return {
        label: p.label,
        positive: raw[0] / sum,
        neutral: raw[1] / sum,
        negative: raw[2] / sum,
      }
    })
  })
}

/**
 * Supporting cast per category. Padded onto an event's own actors so the tall
 * entities card fills out the way the Figma list does.
 */
const SUPPORTING_ENTITIES: Record<EventCategory, string[]> = {
  World: ['Opposition Parties', 'City Councils', 'Foreign Ministries', 'Residents Associations'],
  Business: ['Market Analysts', 'Pension Funds', 'Trade Unions', 'Sector Regulators'],
  Tech: ['Developer Community', 'Privacy Advocates', 'Venture Investors', 'Standards Bodies'],
  Science: ['Peer Reviewers', 'University Labs', 'Science Journalists', 'Ethics Boards'],
  Climate: ['Environmental Groups', 'Local Governments', 'Insurance Industry', 'Research Stations'],
  Sport: ['National Federation', 'Broadcasters', 'Sponsors', 'Fan Associations'],
  Culture: ['Arts Councils', 'Critics', 'Cultural Foundations', 'Festival Organisers'],
}

/** Zipf-ish actor mentions, normalized to articleCount, descending. */
export function entityBreakdown(ev: NewsEvent): Slice[] {
  return memo(`${ev.id}:entities`, () => {
    const rnd = rngFor(ev.id, 'entities')
    const cast = [
      ...ev.entities,
      ...SUPPORTING_ENTITIES[ev.category].filter((e) => !ev.entities.includes(e)),
    ].slice(0, 9)
    const weights = cast.map((_, i) => (1 / (i + 0.6)) * (0.82 + rnd() * 0.36))
    const sum = weights.reduce((a, b) => a + b, 0)
    return cast
      .map((label, i) => ({ label, value: Math.round((weights[i] / sum) * ev.articleCount) }))
      .sort((a, b) => b.value - a.value)
  })
}

/**
 * Per-row trend line for the wide coverage/entities cards. Seeded on the row
 * label so every source keeps its own recognizable wiggle.
 */
export function breakdownSparkline(ev: NewsEvent, label: string, count = 26): number[] {
  return memo(`${ev.id}:rowspark:${label}:${count}`, () => {
    const rnd = rngFor(ev.id, `rowspark:${label}`)
    let v = 0.35 + rnd() * 0.35
    return Array.from({ length: count }, () => {
      v = Math.min(Math.max(v + (rnd() - 0.5) * 0.34, 0.05), 1)
      return v
    })
  })
}

/** One sentence of body copy for the tall "detail" card variants. */
export function metricDetail(ev: NewsEvent, metric: 'sources' | 'sentiment' | 'evolution'): string {
  return memo(`${ev.id}:detail:${metric}`, () => {
    switch (metric) {
      case 'sources': {
        const rows = sourceBreakdown(ev)
        const total = rows.reduce((a, r) => a + r.value, 0)
        const share = Math.round((rows[0].value / total) * 100)
        return `Mais ${sourcesDelta(ev)} fontes entraram na cobertura nas últimas 24h. ${rows[0].label} lidera com ${share}% dos artigos publicados.`
      }
      case 'sentiment': {
        const days = sentimentSeries(ev)
        const delta = Math.round((days[days.length - 1].positive - days[0].positive) * 100)
        const worst = days.reduce((a, b) => (b.negative > a.negative ? b : a))
        const angle = (ev.angles[0] ?? '').toLowerCase()
        const trend =
          Math.abs(delta) < 2
            ? 'O tom positivo manteve-se estável ao longo da semana'
            : `O tom positivo ${delta > 0 ? 'ganhou' : 'perdeu'} ${Math.abs(delta)} pontos ao longo da semana`
        const day = worst.label === 'hoje' ? 'hoje' : (DAY_FULL[worst.label] ?? worst.label)
        return `${trend}; o pico negativo foi ${day}, com ${Math.round(worst.negative * 100)}% dos artigos, puxado por ${angle}.`
      }
      case 'evolution': {
        const s = evolutionStats(ev)
        return `Foram publicados ${s.articles.toLocaleString()} artigos em ${s.events} eventos nos últimos sete dias, uma média de ${s.perEvent} artigos por evento.`
      }
    }
  })
}

export type Narrative = {
  title: string
  source: string
  summary: string
  articles: number
  fontes: number
  /** Index into the category's bundled photo pool. */
  imageIndex: number
}

/** Rows for the narratives widget — fixture headlines plus seeded counts. */
export function narratives(ev: NewsEvent): Narrative[] {
  return memo(`${ev.id}:narratives`, () => {
    const rnd = rngFor(ev.id, 'narratives')
    return ev.headlines.map((headline, i) => {
      const angle = ev.angles[i % ev.angles.length]
      const source = ev.sources[Math.floor(rnd() * ev.sources.length)]
      return {
        title: headline.title,
        source: headline.source,
        summary: `Cobertura centrada em ${angle.toLowerCase()}, com ${source} a liderar o volume de artigos.`,
        articles: 3 + Math.floor(rnd() * 16),
        fontes: 2 + Math.floor(rnd() * 5),
        imageIndex: Math.floor(rnd() * 4),
      }
    })
  })
}
