/**
 * Deterministic mock data derived from a NewsEvent.
 *
 * Nothing here is stored: every series is a pure function of
 * (event id, metric), so it is identical across re-renders, board switches
 * and page reloads. Never seed from an item id — nextItemId() uses
 * Math.random(), so item ids differ every run and the data would drift.
 */

import type { NewsEvent, Sentiment } from './events'

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
