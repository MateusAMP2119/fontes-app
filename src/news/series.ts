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

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** 2026-06-13 -> "13 jun". */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
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

const SUPPORTING_SOURCES = [
  'Diário de Notícias',
  'Jornal de Notícias',
  'TSF',
  'Rádio Renascença',
  'SAPO 24',
  'CNN Portugal',
  'Euronews',
  'El Mundo',
  'Le Monde',
  'The Guardian',
  'Antena 1',
  'Visão',
  'Sábado',
  'France 24',
  'La Vanguardia',
]

/** Zipf-ish outlet distribution, normalized to articleCount, descending. */
export function sourceBreakdown(ev: NewsEvent): Slice[] {
  return memo(`${ev.id}:sources`, () => {
    const rnd = rngFor(ev.id, 'sources')
    const sources = [
      ...ev.sources,
      ...SUPPORTING_SOURCES.filter((source) => !ev.sources.includes(source)),
    ].slice(0, 18)
    const weights = sources.map((_, i) => (1 / (i + 0.6)) * (0.82 + rnd() * 0.36))
    const sum = weights.reduce((a, b) => a + b, 0)
    return sources
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

const TONE_LABELS = ['Positivo', 'Neutro', 'Negativo']

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
    const deltaArticles = -Math.max(Math.round(articles24h * (0.25 + rnd() * 0.4)), 1)
    return { events, deltaEvents, articles24h, deltaArticles }
  })
}

export type ReachKpi = {
  total: number
  delta24h: number
  activityLift: number
}

/** "ALCANCE ESTIMADO" — audience reach, articles × seeded multiplier. */
export function reachKpi(ev: NewsEvent): ReachKpi {
  return memo(`${ev.id}:reach`, () => {
    const rnd = rngFor(ev.id, 'reach')
    const perArticle = (2000 + rnd() * 7000) / 10_000
    const latestArticles = volumeSeries(ev).at(-1)?.value ?? 1
    return {
      total: Math.round(ev.articleCount * perArticle),
      delta24h: Math.max(Math.round(latestArticles * perArticle * (22 + rnd() * 26)), 1),
      activityLift: 8 + Math.floor(rnd() * 23),
    }
  })
}

export type AudienceCluster = {
  label: string
  value: number
}

export type AudienceClusterDay = {
  label: string
  today: boolean
  total: number
  clusters: AudienceCluster[]
}

type AudienceGroup = Pick<AudienceCluster, 'label'>

const AUDIENCE_GROUPS: Record<EventCategory, AudienceGroup[]> = {
  World: [
    { label: 'comunidades afetadas' },
    { label: 'decisores públicos' },
    { label: 'equipas de emergência' },
  ],
  Business: [
    { label: 'executivos e gestores' },
    { label: 'investidores particulares' },
    { label: 'analistas de mercado' },
  ],
  Tech: [
    { label: 'engenheiros de software' },
    { label: 'fundadores de startups' },
    { label: 'investigadores de tecnologia' },
  ],
  Science: [
    { label: 'investigadores científicos' },
    { label: 'professores e educadores' },
    { label: 'profissionais de saúde' },
  ],
  Climate: [
    { label: 'investigadores do clima' },
    { label: 'ativistas ambientais' },
    { label: 'profissionais de energia' },
  ],
  Sport: [
    { label: 'adeptos e sócios' },
    { label: 'atletas e treinadores' },
    { label: 'jornalistas desportivos' },
  ],
  Culture: [
    { label: 'artistas e criadores' },
    { label: 'programadores culturais' },
    { label: 'críticos e jornalistas' },
  ],
}

/** Topic-specific clusters replace the broader category defaults when known. */
const TOPIC_AUDIENCE_GROUPS: Record<string, AudienceGroup[]> = {
  'eclipse-total-iberia': [
    { label: 'astrónomos amadores' },
    { label: 'famílias em viagem' },
    { label: 'comunidade científica' },
  ],
  'ceuta-crise-migratoria': [
    { label: 'decisores públicos' },
    { label: 'organizações humanitárias' },
    { label: 'comunidades migrantes' },
  ],
  'onda-calor-iberia': [
    { label: 'populações vulneráveis' },
    { label: 'bombeiros e proteção civil' },
    { label: 'agricultores' },
  ],
  'privatizacao-tap': [
    { label: 'trabalhadores da TAP' },
    { label: 'investidores' },
    { label: 'passageiros frequentes' },
  ],
}

/** Relative affinity across three audience clusters, normalized to 100%. */
export function audienceClusterProfile(ev: NewsEvent): AudienceCluster[] {
  return memo(`${ev.id}:audienceClusters`, () => {
    const rnd = rngFor(ev.id, 'audienceClusters')
    const groups = TOPIC_AUDIENCE_GROUPS[ev.id] ?? AUDIENCE_GROUPS[ev.category]
    const raw = [0.5, 0.3, 0.2].map((weight) => weight * (0.85 + rnd() * 0.3))
    const total = raw.reduce((sum, value) => sum + value, 0)
    const first = Math.round((raw[0] / total) * 100)
    const second = Math.round((raw[1] / total) * 100)
    const shares = [first, second, 100 - first - second]
    return groups.map((group, i) => ({ ...group, value: shares[i] }))
  })
}

/** Seven-day reach profile: daily volume split across the audience clusters. */
export function audienceClusterWeek(ev: NewsEvent): AudienceClusterDay[] {
  return memo(`${ev.id}:audienceClusterWeek`, () => {
    const rnd = rngFor(ev.id, 'audienceClusterWeek')
    const base = audienceClusterProfile(ev)
    return weekSeries(ev).map((day) => {
      const raw = base.map((cluster) => Math.max(cluster.value * (0.88 + rnd() * 0.24), 4))
      const sum = raw.reduce((total, value) => total + value, 0)
      const first = Math.round((raw[0] / sum) * 100)
      const second = Math.round((raw[1] / sum) * 100)
      const shares = [first, second, 100 - first - second]
      return {
        label: day.label,
        today: day.today,
        total: day.value,
        clusters: base.map((cluster, i) => ({ label: cluster.label, value: shares[i] })),
      }
    })
  })
}

/** Where the leading audience cluster is most concentrated. */
export function audienceFocusSummary(ev: NewsEvent): string {
  const focusByTopic: Record<string, string> = {
    'eclipse-total-iberia': 'faixa de totalidade no nordeste transmontano e norte de Espanha',
    'ceuta-crise-migratoria': 'Ceuta, Andaluzia e centros de decisão em Bruxelas',
    'onda-calor-iberia': 'concelhos do interior e regiões em risco de incêndio',
    'privatizacao-tap': 'hub de Lisboa e centros de decisão europeus',
  }
  if (focusByTopic[ev.id]) return focusByTopic[ev.id]

  const focusByCategory: Record<EventCategory, string> = {
    World: 'comunidades locais e centros de decisão pública',
    Business: 'centros financeiros e equipas de liderança',
    Tech: 'polos tecnológicos e comunidades de produto',
    Science: 'universidades e centros de investigação',
    Climate: 'universidades e organizações ambientais',
    Sport: 'clubes, academias e comunidades de adeptos',
    Culture: 'centros culturais e comunidades criativas',
  }
  return focusByCategory[ev.category]
}

/** Short audience read placed directly below the reach headline. */
export function audienceInterestSummary(ev: NewsEvent, compact = false): string {
  const [first, second, third] = [...audienceClusterProfile(ev)].sort((a, b) => b.value - a.value)
  if (compact) {
    const compactStory: Record<string, string> = {
      'eclipse-total-iberia': 'Astrónomos lideram pela totalidade.',
      'ceuta-crise-migratoria': 'Decisores lideram pela resposta.',
      'onda-calor-iberia': 'Populações lideram pelos alertas.',
      'privatizacao-tap': 'Trabalhadores lideram pelo emprego.',
    }
    return compactStory[ev.id] ?? `Interesse liderado por ${first.label}.`
  }
  const topicStory: Record<string, string> = {
    'eclipse-total-iberia':
      'Astrónomos amadores lideram o interesse pela faixa de totalidade. Famílias em viagem acompanham a logística e o alojamento; a comunidade científica, as campanhas de observação.',
    'ceuta-crise-migratoria':
      'Decisores públicos concentram o maior interesse, seguidos pelas organizações humanitárias no terreno. Comunidades migrantes acompanham a situação na fronteira e o apoio aos menores.',
    'onda-calor-iberia':
      'Populações vulneráveis lideram o interesse pelos avisos de saúde. Bombeiros e proteção civil acompanham o risco de incêndio; agricultores, o impacto da seca nas culturas.',
    'privatizacao-tap':
      'Trabalhadores da TAP lideram o interesse pelas garantias de emprego. Investidores acompanham as propostas vinculativas; passageiros frequentes, o futuro das rotas e da marca.',
  }
  if (topicStory[ev.id]) return topicStory[ev.id]

  const categoryEnding: Record<EventCategory, string> = {
    World: 'por estarem mais próximos das consequências e da resposta pública.',
    Business: 'que acompanham o impacto nos mercados e nas organizações.',
    Tech: 'que acompanham a adoção e os efeitos no setor.',
    Science: 'que acompanham a evidência e as aplicações práticas.',
    Climate: 'que trabalham diretamente na mitigação e adaptação.',
    Sport: 'que vivem de perto a competição e as suas decisões.',
    Culture: 'que acompanham a criação, programação e receção pública.',
  }
  return `${first.label[0].toUpperCase()}${first.label.slice(1)} concentram o maior interesse, seguidos por ${second.label}. ${third.label[0].toUpperCase()}${third.label.slice(1)} também acompanham o tema, ${categoryEnding[ev.category]}`
}

/** "FONTES ATIVAS" delta — new outlets picked up over the last day. */
export function sourcesDelta(ev: NewsEvent): number {
  return memo(`${ev.id}:sourcesDelta`, () => {
    const rnd = rngFor(ev.id, 'sourcesDelta')
    return Math.max(Math.round(ev.sourceCount * (0.1 + rnd() * 0.5)), 1)
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

/** One-sentence read of the week's publishing momentum, for the evolution card. */
export function evolutionMomentum(ev: NewsEvent): string {
  return memo(`${ev.id}:momentum`, () => {
    const days = weekSeries(ev)
    const today = days[days.length - 1]
    const peak = days.reduce((a, b) => (b.value > a.value ? b : a))
    const avg = days.reduce((a, d) => a + d.value, 0) / days.length
    if (peak.value === today.value) {
      const above = Math.round((today.value / avg - 1) * 100)
      const vsAvg = above < 5 ? 'em linha com a média diária' : `${above}% acima da média diária`
      return `O volume atinge hoje o pico da semana, com ${today.value} artigos, ${vsAvg}.`
    }
    const drop = Math.round((1 - today.value / peak.value) * 100)
    const day = DAY_FULL[peak.label] ?? peak.label
    return `O pico da semana foi ${day}, com ${peak.value} artigos; hoje o ritmo está ${drop}% abaixo, com ${today.value}.`
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
  World: ['Partidos da oposição', 'Câmaras municipais', 'Ministérios dos Negócios Estrangeiros', 'Associações de moradores', 'Serviços de emergência', 'Tribunais regionais', 'Observadores internacionais', 'Auditores públicos'],
  Business: ['Analistas de mercado', 'Fundos de pensões', 'Sindicatos', 'Reguladores setoriais', 'Pequenos investidores', 'Autoridade da Concorrência', 'Associações empresariais', 'Analistas de crédito'],
  Tech: ['Comunidade de programadores', 'Defensores da privacidade', 'Investidores de capital de risco', 'Organismos de normalização', 'Fornecedores de cloud', 'Investigadores de segurança', 'Comunidade open-source', 'Compradores empresariais'],
  Science: ['Revisores científicos', 'Laboratórios universitários', 'Jornalistas de ciência', 'Comissões de ética', 'Financiadores de investigação', 'Sociedades científicas', 'Equipas de laboratório', 'Conselheiros de política'],
  Climate: ['Grupos ambientalistas', 'Governos locais', 'Setor segurador', 'Estações de investigação', 'Empresas de energia', 'Comunidades costeiras', 'Associações agrícolas', 'Agências meteorológicas'],
  Sport: ['Federação nacional', 'Televisões', 'Patrocinadores', 'Claques e adeptos', 'Donos dos clubes', 'Sindicato de jogadores', 'Operadores dos estádios', 'Equipas de arbitragem'],
  Culture: ['Direção-Geral das Artes', 'Críticos', 'Fundações culturais', 'Organizadores de festivais', 'Diretores de museus', 'Coletivos de artistas', 'Editoras', 'Salas locais'],
}

/** Zipf-ish actor mentions, normalized to articleCount, descending. */
export type EntitySlice = Slice & {
  role: string
  description: string
  articles: number
  fontes: number
  /** Index into the category's bundled photo pool. */
  imageIndex: number
}

type EntityRule = {
  match: RegExp
  role: string
  action: string
}

const ENTITY_RULES: EntityRule[] = [
  {
    match: /comissão de acompanhamento|tribuna|auditor|observadores|painel|revisores|comissões de ética/i,
    role: 'Supervisão independente',
    action: 'Avalia evidência, verifica conformidade e responsabiliza os intervenientes.',
  },
  {
    match: /proteção civil|defesa civil|guardia civil|bombeiros|equipas|serviços de emergência/i,
    role: 'Operação no terreno',
    action: 'Executa o trabalho no terreno, recolhe evidência e reporta resultados.',
  },
  {
    match: /investigador|cientista|analista|instituto|observatório|comunidade científica|laboratório|universidad/i,
    role: 'Especialistas técnicos',
    action: 'Produz análise especializada e interpreta os impactos técnicos do evento.',
  },
  {
    match: /governo|ministério|comissão|autoridade|regulador|autarquia|município|câmara|presidência|congresso|administração|interpol|união africana|nações unidas|ocha|acnur|programa alimentar|ipma|aemet|inmet|serviço nacional|liga portugal|agências|direção-geral/i,
    role: 'Entidade pública',
    action: 'Define regras, fiscaliza o processo e decide sobre autorizações públicas.',
  },
  {
    match: /fundo|investidor|acionista|doadore|bancos|financiador|patrocinador/i,
    role: 'Financiamento',
    action: 'Disponibiliza capital e condiciona prioridades, prazos e escala da iniciativa.',
  },
  {
    match: /sindicato|associaç|comunidades|famílias|moradores|adeptos|claques|ong|grupos|inquilinos|cruz vermelha|organizações humanitárias|partidos|coletivos/i,
    role: 'Representação coletiva',
    action: 'Representa as pessoas afetadas e leva preocupações públicas para a decisão.',
  },
  {
    match: /operador|concessionári|fornecedores|plataformas|telecomunicações|tap\b|air france|lufthansa|ren\b|televisões|empresas de energia/i,
    role: 'Operador do setor',
    action: 'Opera a infraestrutura ou serviço diretamente afetado por este evento.',
  },
  {
    match: /fabricante|empreiteiro|estúdio|promotor|empresas|startups|editoras|organizadores/i,
    role: 'Parceiro industrial',
    action: 'Transforma o plano em capacidade operacional, produção e controlo de qualidade.',
  },
]

/**
 * Real, named cast for curated topics — used verbatim instead of the
 * event's generic actors plus category padding.
 */
type CuratedEntity = { label: string; role: string; description: string }

const TOPIC_ENTITIES: Record<string, CuratedEntity[]> = {
  'oe2026-habitacao': [
    {
      label: 'Miguel Pinto Luz',
      role: 'Ministro das Infraestruturas e Habitação',
      description: 'Apresentou o pacote de habitação do OE2026 e a meta de devolver 300 mil casas devolutas ao mercado.',
    },
    {
      label: 'Luís Montenegro',
      role: 'Primeiro-Ministro',
      description: 'Fez da habitação uma prioridade política do Orçamento e defende o alargamento do Porta 65 aos jovens.',
    },
    {
      label: 'IHRU',
      role: 'Instituto público da habitação',
      description: 'Gere o parque habitacional do Estado e executa o Porta 65 e os apoios ao arrendamento.',
    },
    {
      label: 'Assembleia da República',
      role: 'Poder legislativo',
      description: 'Debate e vota o OE2026, incluindo a isenção de IMT na primeira casa e a garantia pública no crédito jovem.',
    },
    {
      label: 'Associação Portuguesa de Bancos',
      role: 'Setor bancário',
      description: 'Negoceia com o Governo a operacionalização da garantia pública no crédito à habitação para jovens.',
    },
    {
      label: 'Associação Nacional de Municípios',
      role: 'Autarquias',
      description: 'Reivindica parcerias com o Estado para reabilitar o património público devoluto nos concelhos.',
    },
    {
      label: 'Associação dos Inquilinos Lisbonenses',
      role: 'Inquilinos',
      description: 'Pede reforço dos apoios à renda e critica a aposta na compra em vez do arrendamento acessível.',
    },
    {
      label: 'APPII',
      role: 'Promotores imobiliários',
      description: 'Defende licenciamentos mais rápidos e IVA reduzido na construção para aumentar a oferta.',
    },
  ],
}

function entityProfile(
  ev: NewsEvent,
  label: string,
  index: number,
): Pick<EntitySlice, 'role' | 'description' | 'imageIndex'> {
  const rule = ENTITY_RULES.find(({ match }) => match.test(label)) ?? {
    role: 'Interveniente central',
    action: 'Participa nas decisões e na execução das medidas associadas ao evento.',
  }
  const focus = ev.angles[index % ev.angles.length].toLowerCase()
  return {
    role: rule.role,
    description: `${rule.action} Na cobertura, surge ligada a ${focus}.`,
    imageIndex: hashSeed(label) % 4,
  }
}

export function entityBreakdown(ev: NewsEvent): EntitySlice[] {
  return memo(`${ev.id}:entities`, () => {
    const rnd = rngFor(ev.id, 'entities')
    const curated = TOPIC_ENTITIES[ev.id]
    const cast = curated
      ? curated.map((c) => c.label)
      : [
          ...ev.entities,
          ...SUPPORTING_ENTITIES[ev.category].filter((e) => !ev.entities.includes(e)),
        ].slice(0, 14)
    const weights = cast.map((_, i) => (1 / (i + 0.6)) * (0.82 + rnd() * 0.36))
    const sum = weights.reduce((a, b) => a + b, 0)
    const mentionTotal = Math.round(ev.articleCount * (1.35 + rnd() * 0.8))
    const peakWeight = Math.max(...weights, 1)
    return cast
      .map((label, i) => {
        const prominence = weights[i] / peakWeight
        const profile = curated
          ? {
              role: curated[i].role,
              description: curated[i].description,
              imageIndex: hashSeed(label) % 4,
            }
          : entityProfile(ev, label, i)
        return {
          ...profile,
          label,
          value: Math.max(Math.round((weights[i] / sum) * mentionTotal), 1),
          articles: Math.min(
            ev.articleCount,
            Math.max(Math.round(ev.articleCount * (0.06 + prominence * 0.58) * (0.86 + rnd() * 0.24)), 1),
          ),
          fontes: Math.min(
            ev.sourceCount,
            Math.max(Math.round(ev.sourceCount * (0.08 + prominence * 0.62) * (0.88 + rnd() * 0.2)), 1),
          ),
        }
      })
      .sort((a, b) => b.articles - a.articles || b.fontes - a.fontes)
  })
}

/** Per-entity trend line used by the compact list rows introduced on main. */
export function breakdownSparkline(ev: NewsEvent, label: string, count = 26): number[] {
  return memo(`${ev.id}:rowspark:${label}:${count}`, () => {
    const rnd = rngFor(ev.id, `rowspark:${label}`)
    let value = 0.35 + rnd() * 0.35
    return Array.from({ length: count }, () => {
      value = Math.min(Math.max(value + (rnd() - 0.5) * 0.34, 0.05), 1)
      return value
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
  sources: string[]
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
    const rowCount = 12
    return Array.from({ length: rowCount }, (_, i) => {
      const headline = ev.headlines[i % ev.headlines.length]
      const cycle = Math.floor(i / ev.headlines.length)
      const angle = ev.angles[i % ev.angles.length]
      const sourcePool = [
        headline.source,
        ...ev.sources.filter((source) => source !== headline.source),
      ]
      const sourceCount = Math.min(2 + Math.floor(rnd() * 5), sourcePool.length)
      const offset = Math.floor(rnd() * sourcePool.length)
      const sources = Array.from(
        { length: sourceCount },
        (_, sourceIndex) => sourcePool[(sourceIndex + offset) % sourcePool.length],
      )
      const title =
        cycle === 0
          ? headline.title
          : `${cycle === 1 ? 'Em detalhe' : 'Contexto'}: ${angle} — ${headline.title}`
      return {
        title,
        sources,
        summary: `Cobertura centrada em ${angle.toLowerCase()}, com ${sources[0]} a liderar o volume de artigos.`,
        articles: 3 + Math.floor(rnd() * 16),
        fontes: sources.length,
        imageIndex: Math.floor(rnd() * 4),
      }
    })
  })
}
