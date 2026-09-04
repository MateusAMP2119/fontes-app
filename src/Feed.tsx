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
  /** Preview images of the newest articles, newest first. */
  images: string[]
}

const API = import.meta.env.VITE_API_URL as string
const PAGE = 20

const relative = new Intl.RelativeTimeFormat('pt', { numeric: 'auto' })
function ago(iso: string): string {
  const hours = Math.round((Date.parse(iso) - Date.now()) / 3_600_000)
  return Math.abs(hours) < 48
    ? relative.format(hours, 'hour')
    : relative.format(Math.round(hours / 24), 'day')
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/**
 * The story's article previews in a snap-scrolling strip: arrows on hover,
 * a swipe on touch. A preview that fails to load drops out of the strip.
 */
function Carousel({ images }: { images: string[] }) {
  const stripRef = useRef<HTMLDivElement>(null)
  const slide = (direction: -1 | 1) => {
    const strip = stripRef.current
    strip?.scrollBy({ left: direction * strip.clientWidth, behavior: 'smooth' })
  }
  return (
    <div className="feed-carousel">
      <div className="feed-strip" ref={stripRef}>
        {images.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            loading={index ? 'lazy' : undefined}
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.hidden = true
            }}
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" className="feed-arrow feed-arrow-prev" aria-label="Imagem anterior" onClick={() => slide(-1)}>
            <svg aria-hidden="true" width={20} height={20} viewBox="0 0 24 24">
              <path d="M18 12H6m6-6-6 6 6 6" {...stroke} />
            </svg>
          </button>
          <button type="button" className="feed-arrow feed-arrow-next" aria-label="Imagem seguinte" onClick={() => slide(1)}>
            <svg aria-hidden="true" width={20} height={20} viewBox="0 0 24 24">
              <path d="M6 12h12m-6-6 6 6-6 6" {...stroke} />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

// ponytail: cards go nowhere yet; give them a story page when one exists.
export default function Feed({ session }: { session: Session | null }) {
  const [stories, setStories] = useState<Story[]>([])
  const [status, setStatus] = useState<'loading' | 'more' | 'end' | 'error'>('loading')
  const sentinelRef = useRef<HTMLDivElement>(null)
  // Signed-in callers get the API's higher rate allowance.
  const token = session?.access_token

  const load = useCallback(
    async (offset: number) => {
      setStatus('loading')
      try {
        const response = await fetch(`${API}/stories?limit=${PAGE}&offset=${offset}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!response.ok) throw new Error(`${response.status}`)
        const page: Story[] = await response.json()
        setStories((previous) => (offset ? [...previous, ...page] : page))
        setStatus(page.length < PAGE ? 'end' : 'more')
      } catch {
        setStatus('error')
      }
    },
    [token],
  )
  useEffect(() => {
    void load(0)
  }, [load])

  // Infinite scroll: the next page loads once the tail nears the viewport.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || status !== 'more') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void load(stories.length)
      },
      { rootMargin: '800px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [status, stories.length, load])

  return (
    <section className="make-feed" aria-labelledby="feed-heading">
      <h2 id="feed-heading">Histórias recentes</h2>
      <div className="feed-grid">
        {stories.map((story) => (
          <article className="feed-story" key={story.id}>
            <Carousel images={story.images ?? []} />
            <h3>{story.title}</h3>
            <p>
              {story.source_count} fontes · {story.article_count} artigos · {ago(story.latest_at)}
            </p>
          </article>
        ))}
      </div>
      <div className="feed-status" ref={sentinelRef}>
        {status === 'loading' && <span>A carregar…</span>}
        {status === 'error' && (
          <>
            <span>Não foi possível carregar as histórias.</span>
            <button type="button" onClick={() => void load(stories.length)}>
              Tentar de novo
            </button>
          </>
        )}
      </div>
    </section>
  )
}
