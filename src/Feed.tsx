import { useCallback, useEffect, useRef, useState } from 'react'
import type { AuthSession } from './auth'
import { Sparkline } from './components/Sparkline'
import './Feed.css'

/** One row of GET /api/stories (functions/api/stories.ts), the engine's stories mirrored to the edge. */
type Story = {
  id: number
  slug: string | null
  title: string
  description: string
  event_count: number
  article_count: number
  source_count: number
  first_at: string
  latest_at: string
  /** Article arrivals in 12 equal buckets from the story's origin until now. */
  popularity?: number[]
  /** Feed position, and the move since the position before the latest third of the story's coverage (functions/api/stories.ts). */
  rank?: number
  rank_change?: number
  /** Newest preview image, when any article has one. */
  image: string | null
  /** Small JPEG data URI of it, made by the engine; absent on search results. */
  thumb?: string | null
  /** Publishers, most articles first. */
  sources: { name: string; host: string | null }[]
}

type StoryDetail = {
  events?: { articles?: { discovered_at?: string }[] }[]
}

const API = import.meta.env.VITE_API_URL as string
const PAGE = 20
const SKELETON_ROWS = 8
const MAX_LOGOS = 8
// fonteslabs.com's per-story date: "Hoje", "Ontem", then "22 ago", the year only when it is not this one
const dayMonth = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' })
function shortDay(iso: string): string {
  const then = new Date(iso)
  const today = new Date()
  then.setHours(12, 0, 0, 0)
  today.setHours(12, 0, 0, 0)
  const days = Math.round((today.getTime() - then.getTime()) / 864e5)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  const label = dayMonth.format(then).replace('.', '')
  return then.getFullYear() === today.getFullYear() ? label : `${label} ${then.getFullYear()}`
}

const favicon = (host: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`

/** Puts a page's full-size pictures in the browser cache before its rows exist. */
function warm(page: Story[]) {
  for (const story of page) {
    if (story.thumb || !story.image) continue
    const picture = new Image()
    picture.decoding = 'async'
    picture.src = story.image
  }
}

function Row({ story, index }: { story: Story; index: number }) {
  return (
    <article className="m-story">
      <time className="m-story-date" dateTime={story.latest_at}>{shortDay(story.latest_at)}</time>
      <h3>{story.title}</h3>
      <div className="m-front-stack">
        {story.thumb || story.image ? (
          <img
            className="m-front-media"
            src={story.thumb ?? story.image ?? undefined}
            alt=""
            width={96}
            height={96}
            loading={index < 6 ? undefined : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(event) => event.currentTarget.removeAttribute('src')}
          />
        ) : (
          <span className="m-front-media" aria-hidden="true" />
        )}
        <Popularity story={story} />
        {story.rank != null && <RankKpi rank={story.rank} change={story.rank_change} />}
      </div>
      <ul className="m-sources" aria-label={`${story.source_count} fontes`}>
        {(story.sources ?? [])
          .filter((source) => source.host)
          .slice(0, MAX_LOGOS)
          .map((source) => (
            <li key={source.name} title={source.name}>
              <img src={favicon(source.host!)} alt="" width={20} height={20} loading="lazy" decoding="async" />
            </li>
          ))}
      </ul>
    </article>
  )
}

function Popularity({ story }: { story: Story }) {
  const [values, setValues] = useState(() => (story.popularity ?? []).filter(Number.isFinite))
  const chartRef = useRef<HTMLSpanElement>(null)
  const hasTrend = values.length >= 2

  useEffect(() => {
    const provided = (story.popularity ?? []).filter(Number.isFinite)
    if (provided.length >= 2) {
      setValues(provided)
      return
    }

    const chart = chartRef.current
    if (!chart) return
    const controller = new AbortController()
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        void fetch(`${API}/stories/${story.slug ?? story.id}`, { signal: controller.signal })
          .then((response) => {
            if (!response.ok) throw new Error(`${response.status}`)
            return response.json() as Promise<StoryDetail>
          })
          .then((detail) => setValues(activityBuckets(detail)))
          .catch(() => {})
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(chart)
    return () => {
      observer.disconnect()
      controller.abort()
    }
  }, [story.popularity, story.id, story.slug])

  const window = Math.max(1, Math.floor(values.length / 3))
  const previous = hasTrend ? average(values.slice(-window * 2, -window)) : 0
  const current = hasTrend ? average(values.slice(-window)) : 0
  const direction = !hasTrend ? 'pending' : current > previous ? 'up' : current < previous ? 'down' : 'flat'
  const label = direction === 'up' ? 'a subir' : direction === 'down' ? 'a descer' : direction === 'flat' ? 'estável' : 'a calcular'

  return (
    <span
      ref={chartRef}
      className={`m-popularity is-${direction}`}
      role="img"
      aria-label={`Popularidade ${label} desde ${shortDay(story.first_at)}`}
      title={`${shortDay(story.first_at)} – ${shortDay(story.latest_at)}`}
    >
      {hasTrend && <Sparkline values={values} width={96} height={20} area strokeWidth={1.5} curve />}
    </span>
  )
}

function RankKpi({ rank, change }: { rank: number; change?: number }) {
  const direction = change == null || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'
  const movement = change == null ? 'novo' : change === 0 ? '→' : `${change > 0 ? '↑' : '↓'}${Math.abs(change)}`
  const label = change == null
    ? `Posição ${rank}`
    : change > 0
      ? `Posição ${rank}, subiu ${change} lugares`
      : change < 0
        ? `Posição ${rank}, desceu ${Math.abs(change)} lugares`
        : `Posição ${rank}, sem alteração`
  return (
    <span className={`m-rank-kpi is-${direction}`} aria-label={label}>
      #{rank} {movement}
    </span>
  )
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1)
}

function activityBuckets(detail: StoryDetail, count = 12): number[] {
  const times = (detail.events ?? [])
    .flatMap((event) => event.articles ?? [])
    .map((article) => Date.parse(article.discovered_at ?? ''))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  if (times.length < 2) return []

  const first = times[0]
  const span = times[times.length - 1] - first
  if (span <= 0) return []
  const buckets = Array<number>(count).fill(0)
  for (const time of times) {
    const bucket = Math.min(count - 1, Math.floor(((time - first) / span) * count))
    buckets[bucket] += 1
  }
  return buckets
}

function Skeleton() {
  return (
    <div className="m-story m-story--skeleton" aria-hidden="true">
      <span className="m-story-date m-card-skeleton" />
      <h3>
        <span className="m-card-skeleton" />
        <span className="m-card-skeleton" />
      </h3>
      <span className="m-front-stack">
        <span className="m-front-media m-card-skeleton" />
        <span className="m-popularity m-card-skeleton" />
      </span>
      <span className="m-sources m-card-skeleton" />
    </div>
  )
}

// ponytail: rows go nowhere yet; give them a story page when one exists.
export default function Feed({ session: _session, queries = [] }: { session: AuthSession | null; queries?: string[] }) {
  const [stories, setStories] = useState<Story[]>([])
  const [status, setStatus] = useState<'loading' | 'more' | 'end' | 'error'>('loading')
  const sentinelRef = useRef<HTMLDivElement>(null)
  // Bumped per query so a slow page for the old one is dropped, not shown.
  const generation = useRef(0)
  // The page after the last one shown, requested as soon as that one
  // arrived, so appending it costs nothing the reader can see.
  const nextPage = useRef<Promise<Story[]> | null>(null)
  const nextOffset = useRef(0)
  // Signed-in callers get the API's higher rate allowance.
  const token = undefined

  const fetchPage = useCallback(
    async (offset: number): Promise<Story[]> => {
      // Browsing reads the edge mirror (functions/api/stories.ts) page by
      // page. Searches ask the engine once per stored term and merge the
      // answers, newest first; the engine matches whole words, so
      // "vice-presidente" must go up as two.
      // ponytail: one page of 100 per term, no paging; page when a term passes that.
      const read = async (url: string): Promise<Story[]> => {
        const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        if (!response.ok) throw new Error(`${response.status}`)
        return response.json()
      }
      let page: Story[]
      if (queries.length) {
        const answers = await Promise.all(
          queries.map((term) => read(`${API}/stories?limit=100&q=${encodeURIComponent(term.replace(/[^\p{L}\p{N}]+/gu, ' '))}`)),
        )
        const seen = new Set<number>()
        page = answers
          .flat()
          .filter((story) => !seen.has(story.id) && seen.add(story.id))
          .sort((a, b) => Date.parse(b.latest_at) - Date.parse(a.latest_at))
      } else {
        page = await read(`/api/stories?limit=${PAGE}&offset=${offset}`)
      }
      warm(page)
      return page
    },
    [token, queries],
  )

  const prefetch = useCallback(
    (offset: number) => {
      nextOffset.current = offset
      nextPage.current = fetchPage(offset)
      nextPage.current.catch(() => {})
    },
    [fetchPage],
  )

  /** Appends the prefetched page and requests the one after it. */
  const advance = useCallback(async () => {
    const pending = nextPage.current
    if (!pending) return
    nextPage.current = null
    const mine = generation.current
    setStatus('loading')
    try {
      const page = await pending
      if (mine !== generation.current) return
      setStories((previous) => (nextOffset.current ? [...previous, ...page] : page))
      if (page.length < PAGE || queries.length) {
        setStatus('end')
        return
      }
      prefetch(nextOffset.current + page.length)
      setStatus('more')
    } catch {
      setStatus('error')
    }
  }, [prefetch, queries.length])

  useEffect(() => {
    generation.current += 1
    setStories([])
    prefetch(0)
    void advance()
  }, [prefetch, advance])

  // Infinite scroll: the buffered page goes in well before the tail is reached.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || status !== 'more') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void advance()
      },
      { rootMargin: '1200px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [status, advance])

  const retry = () => {
    prefetch(nextOffset.current)
    void advance()
  }

  return (
    <section className="make-feed" aria-label="Histórias">
      <div className="feed-list">
        {stories.map((story, index) => (
          <Row story={story} index={index} key={story.id} />
        ))}
        {!stories.length && status === 'loading' &&
          Array.from({ length: SKELETON_ROWS }, (_, index) => <Skeleton key={index} />)}
      </div>
      <div className="m-feed-sentinel" ref={sentinelRef}>
        {status === 'loading' && stories.length > 0 && <span>A carregar…</span>}
        {status === 'end' && stories.length === 0 && <span>Nenhuma história encontrada.</span>}
        {status === 'error' && (
          <>
            <span>Não foi possível carregar as histórias.</span>
            <button type="button" onClick={retry}>
              Tentar de novo
            </button>
          </>
        )}
      </div>
    </section>
  )
}
