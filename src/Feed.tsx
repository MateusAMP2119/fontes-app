import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './Feed.css'

/** One row of GET /stories on the Fontes API (iris-core, src/openapi.yaml). */
type Story = {
  id: number
  slug: string | null
  title: string
  description: string
  event_count: number
  article_count: number
  source_count: number
  latest_at: string
  /** Newest preview image, when any article has one. */
  image: string | null
  /** Publishers, most articles first. */
  sources: { name: string; host: string | null }[]
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

/** Puts a page's pictures in the browser cache before its rows exist. */
function warm(page: Story[]) {
  for (const story of page) {
    if (!story.image) continue
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
      {story.image ? (
        <img
          className="m-front-media"
          src={story.image}
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

function Skeleton() {
  return (
    <div className="m-story m-story--skeleton" aria-hidden="true">
      <span className="m-story-date m-card-skeleton" />
      <h3>
        <span className="m-card-skeleton" />
        <span className="m-card-skeleton" />
      </h3>
      <span className="m-front-media m-card-skeleton" />
      <span className="m-sources m-card-skeleton" />
    </div>
  )
}

// ponytail: rows go nowhere yet; give them a story page when one exists.
export default function Feed({ session, query = '' }: { session: Session | null; query?: string }) {
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
  const token = session?.access_token

  const fetchPage = useCallback(
    async (offset: number): Promise<Story[]> => {
      // the API matches whole words, so "vice-presidente" must go up as two
      const q = query ? `&q=${encodeURIComponent(query.replace(/[^\p{L}\p{N}]+/gu, ' '))}` : ''
      const response = await fetch(`${API}/stories?limit=${PAGE}&offset=${offset}${q}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) throw new Error(`${response.status}`)
      const page: Story[] = await response.json()
      warm(page)
      return page
    },
    [token, query],
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
      if (page.length < PAGE) {
        setStatus('end')
        return
      }
      prefetch(nextOffset.current + page.length)
      setStatus('more')
    } catch {
      setStatus('error')
    }
  }, [prefetch])

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
    <section className="make-feed" aria-labelledby="feed-heading">
      <h2 id="feed-heading">{query ? `Resultados para “${query}”` : 'Histórias recentes'}</h2>
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
