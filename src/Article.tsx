import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { navigate } from './navigate'
import { mountKicker } from './kicker'
import './Article.css'

const API = import.meta.env.VITE_API_URL as string

type Entity = { id: number; kind: 'person' | 'org' | 'location'; name: string; slug: string | null }

/** One member article; `image` is its preview picture when the publisher gave one. */
type Clip = {
  id: string
  url: string
  title: string | null
  summary: string | null
  source: string
  image: string | null
  discovered_at: string
}

/** GET /events/{key}: the headline, its two sentences on one line, the key entities the summarizer named, and the member articles newest first. */
type EventDetail = {
  id: number
  slug: string | null
  title: string
  description: string
  first_at: string
  latest_at: string
  entities: Entity[]
  articles: Clip[]
}

/** GET /stories/{key}: the headline, two paragraphs, and the member events newest first, each shaped like GET /events/{key}. */
type StoryDetail = { id: number; slug: string | null; title: string; description: string; summarized_at: string; events: EventDetail[] }

/** What the page draws, from either an event or a story; `events` lists a story's members, an event lists none. */
type Page = { title: string; date: string; paragraphs: string[]; entities: Entity[]; articles: Clip[]; events: EventDetail[] }

const paragraphs = (text: string) => text.split(/\n\s*\n/)

const fromEvent = (event: EventDetail): Page => ({
  title: event.title,
  date: event.latest_at,
  paragraphs: paragraphs(event.description),
  entities: event.entities,
  articles: event.articles,
  events: [],
})

const plain = (name: string) => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** A story reads as one article: every event's entities dotted, every event's articles in the strip. */
// ponytail: two events can name the same thing under two entity ids; fold by name here until the engine merges them.
const fromStory = (story: StoryDetail): Page => {
  const seen = new Set<string>()
  return {
    title: story.title,
    date: story.events.map((event) => event.latest_at).sort().at(-1) ?? story.summarized_at,
    paragraphs: paragraphs(story.description),
    entities: story.events.flatMap((event) => event.entities).filter((entity) => !seen.has(plain(entity.name)) && seen.add(plain(entity.name))),
    articles: story.events.flatMap((event) => event.articles).sort((a, b) => b.discovered_at.localeCompare(a.discovered_at)),
    // newest to break first; the API orders by the latest article instead
    events: [...story.events].sort((a, b) => b.first_at.localeCompare(a.first_at)),
  }
}

const host = (url: string) => new URL(url).hostname.replace(/^www\./, '')

// ponytail: the same piece comes again with an "#utm" fragment from the RSS crawl, or under a second URL with the same headline; fold those here until the engine does.
function uniqueClips(articles: Clip[]): Clip[] {
  const seen = new Set<string>()
  return articles.filter((clip) => {
    const key = clip.title ? `${clip.source}\n${clip.title}` : clip.url.split('#')[0]
    return !seen.has(key) && seen.add(key)
  })
}

const KIND_LABEL: Record<Entity['kind'], string> = { person: 'Pessoa', org: 'Organização', location: 'Local' }

// the dataviz reference palette's first four categorical slots, validated for the light surface
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100']
const HOUR = 36e5
const DAY = 24 * HOUR
const CHART_H = 220
const PAD = { top: 12, bottom: 28, left: 28 }

// Chrome's pt-PT prints a short month as "30/08"; the feed's style is "30 ago"
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** The time buckets the articles span: hours on one day, days past that, weeks past a quarter. */
// ponytail: fixed thresholds, no nice-number search; add one when a span lands awkwardly between them.
function timeAxis(times: number[]) {
  const lo = Math.min(...times)
  const hi = Math.max(...times)
  const span = hi - lo
  const size = span < 36 * HOUR ? HOUR : span > 90 * DAY ? 7 * DAY : DAY
  const first = new Date(lo)
  if (size === HOUR) first.setMinutes(0, 0, 0)
  else first.setHours(0, 0, 0, 0)
  const start = first.getTime()
  const count = Math.floor((hi - start) / size) + 1
  const label = (index: number) => {
    const at = new Date(start + index * size)
    return size === HOUR ? `${String(at.getHours()).padStart(2, '0')}h` : `${at.getDate()} ${MONTHS[at.getMonth()]}`
  }
  return { size, start, count, label, index: (time: number) => Math.floor((time - start) / size) }
}

/** The key entities most named across the articles, compared on one shared straight-line chart. */
function Mentions({ entities, articles }: { entities: Entity[]; articles: Clip[] }) {
  const frame = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    const element = frame.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const clips = uniqueClips(articles).map((clip) => ({ text: `${clip.title ?? ''} ${clip.summary ?? ''}`, at: Date.parse(clip.discovered_at) }))
  const ranked = entities
    .map((entity) => {
      const pattern = formsPattern(entityForms([entity]), 'iu')
      const hits = clips.filter((clip) => pattern.test(clip.text))
      return { entity, hits, total: hits.length }
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || a.entity.name.localeCompare(b.entity.name))
    .slice(0, SERIES.length)
  if (!ranked.length || !clips.length) return null

  const axis = timeAxis(clips.map((clip) => clip.at))
  const series = ranked.map((row, slot) => {
    const counts = Array<number>(axis.count).fill(0)
    for (const hit of row.hits) counts[axis.index(hit.at)] += 1
    return { ...row, counts, color: SERIES[slot] }
  })
  const peak = Math.max(1, ...series.flatMap((line) => line.counts))
  const step = Math.ceil(peak / 4)
  const top = Math.ceil(peak / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, index) => index * step)

  const plotW = Math.max(0, width - PAD.left - 12)
  const plotH = CHART_H - PAD.top - PAD.bottom
  const x = (index: number) => PAD.left + (axis.count > 1 ? (index / (axis.count - 1)) * plotW : plotW / 2)
  const y = (value: number) => PAD.top + (1 - value / top) * plotH
  const every = Math.ceil(axis.count / Math.max(2, Math.floor(plotW / 56)))

  const track = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const unit = axis.count > 1 ? plotW / (axis.count - 1) : plotW
    setHover(Math.min(axis.count - 1, Math.max(0, Math.round((event.clientX - box.left - PAD.left) / unit))))
  }

  return (
    <section className="article-entities" aria-labelledby="article-entities-title">
      <h2 id="article-entities-title">Principais entidades</h2>
      <div className="article-chart-shell">
        <div className="article-chart" ref={frame}>
          {width > 0 && (
            <svg
              role="img"
              aria-label={series.map((line) => `${line.entity.name}: ${line.total} artigos`).join('; ')}
              width={width}
              height={CHART_H}
              onPointerMove={track}
              onPointerLeave={() => setHover(null)}
            >
              {ticks.map((tick) => (
                <g key={tick}>
                  <line x1={PAD.left} x2={PAD.left + plotW} y1={y(tick)} y2={y(tick)} className="article-grid" />
                  <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="article-tick">{tick}</text>
                </g>
              ))}
              {Array.from({ length: axis.count }, (_, index) => index)
                .filter((index) => index % every === 0)
                .map((index) => (
                  <text
                    key={index}
                    x={x(index)}
                    y={CHART_H - 8}
                    textAnchor={index === 0 ? 'start' : index === axis.count - 1 ? 'end' : 'middle'}
                    className="article-tick"
                  >
                    {axis.label(index)}
                  </text>
                ))}
              {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} className="article-crosshair" />}
              {series.map((line) => {
                const path = line.counts.map((value, point) => `${point ? 'L' : 'M'}${x(point).toFixed(1)} ${y(value).toFixed(1)}`).join(' ')
                const area = `${path} L${x(axis.count - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`
                return (
                  <g key={line.entity.id}>
                    <path d={area} fill={line.color} opacity={0.07} />
                    <path
                      d={path}
                      fill="none"
                      stroke={line.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {(hover != null || axis.count === 1) && (
                      <circle cx={x(hover ?? 0)} cy={y(line.counts[hover ?? 0])} r={4} fill={line.color} stroke="#fff" strokeWidth={2} />
                    )}
                  </g>
                )
              })}
            </svg>
          )}
          {hover != null && width > 0 && (
            <div className="article-chart-tip" style={{ left: Math.min(Math.max(x(hover), 80), width - 80) }}>
              <strong>{axis.label(hover)}</strong>
              {series.map((line) => (
                <span key={line.entity.id}>
                  <i className="article-swatch" style={{ background: line.color }} />
                  {line.entity.name}
                  <b>{line.counts[hover]}</b>
                </span>
              ))}
            </div>
          )}
        </div>
        <ul className="article-legend" aria-label="Séries">
          {series.map((line) => (
            <li key={line.entity.id} title={KIND_LABEL[line.entity.kind]}>
              <i className="article-swatch" style={{ background: line.color }} />
              {line.entity.name}
              <b>{line.total}</b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const SHOWN_ARTICLES = 3

const startOfDay = (date: Date) => new Date(date).setHours(0, 0, 0, 0)

/** "Hoje, 14:20", "Ontem, 09:05", then "3 set, 14:20". */
const when = (iso: string) => {
  const at = new Date(iso)
  const days = Math.round((startOfDay(new Date()) - startOfDay(at)) / DAY)
  const day = days === 0 ? 'Hoje' : days === 1 ? 'Ontem' : `${at.getDate()} ${MONTHS[at.getMonth()]}`
  return `${day}, ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
}

/** One event: the publishers' marks, the title, the first three articles as quiet rows and "Ver mais" for the rest. */
function EventRow({ event }: { event: EventDetail }) {
  const [open, setOpen] = useState(false)
  const clips = uniqueClips(event.articles)
  // one mark per publisher, from its newest article
  const publishers = new Map<string, string>()
  for (const clip of clips) if (!publishers.has(clip.source)) publishers.set(clip.source, clip.url)
  // one row per headline, even when two publishers ran the same wire piece
  const titles = new Set<string>()
  const headlines = clips.filter((clip) => !titles.has(clip.title ?? clip.url) && titles.add(clip.title ?? clip.url))
  const shown = open ? headlines : headlines.slice(0, SHOWN_ARTICLES)
  return (
    <li>
      <div className="article-event-head">
        <span className="article-marks" aria-label={[...publishers.keys()].join(', ')}>
          {[...publishers].map(([publisher, url]) => (
            <img
              key={publisher}
              src={favicon(url)}
              alt=""
              title={publisher}
              width={24}
              height={24}
              loading="lazy"
              decoding="async"
              onError={(picture) => picture.currentTarget.removeAttribute('src')}
            />
          ))}
        </span>
        <time dateTime={event.first_at}>{when(event.first_at)}</time>
      </div>
      <p className="article-event-title">{event.title}</p>
      <ul className="article-event-links">
        {shown.map((clip) => (
          <li key={clip.url}>
            <a href={clip.url} target="_blank" rel="noreferrer" title={clip.source}>{clip.title ?? host(clip.url)}</a>
          </li>
        ))}
        {headlines.length > SHOWN_ARTICLES && (
          <li>
            <button type="button" className="article-event-more" onClick={() => setOpen((value) => !value)}>
              {open ? 'Ver menos' : `Ver mais ${headlines.length - SHOWN_ARTICLES}`}
            </button>
          </li>
        )}
      </ul>
    </li>
  )
}

/** A story's events, newest first. */
function Events({ events }: { events: EventDetail[] }) {
  if (!events.length) return null
  return (
    <section className="article-events" aria-label="Eventos">
      <ol>
        {events.map((event) => <EventRow event={event} key={event.id} />)}
      </ol>
    </section>
  )
}

/** The page's shape while it loads, in the feed's shimmer: date, headline, three cards, the lede, the chart, four events. */
function Skeleton() {
  const bar = (className: string, key?: number) => <span className={`m-card-skeleton ${className}`} key={key} />
  return (
    <>
      <p className="sr-only" role="status">A carregar…</p>
      <div className="article-main" aria-hidden="true">
        {bar('article-skel-date')}
        <div className="article-skel-title">{bar('', 0)}{bar('', 1)}</div>
        <section className="m-clips">
          <ul className="m-clips-track">
            {[0, 1, 2].map((card) => (
              <li className="m-clip" key={card}>
                {bar('article-skel-media')}
                {bar('article-skel-source')}
                {bar('article-skel-caption')}
              </li>
            ))}
          </ul>
        </section>
        <div className="article-lede article-skel-lede">{[0, 1, 2, 3].map((line) => bar('', line))}</div>
        <div className="article-lede article-skel-lede">{[0, 1, 2].map((line) => bar('', line))}</div>
        <div className="article-entities">
          {bar('article-skel-heading')}
          {bar('article-skel-chart')}
        </div>
      </div>
      <section className="article-events" aria-hidden="true">
        <ol>
          {[0, 1, 2, 3].map((row) => (
            <li key={row}>
              <div className="article-event-head">
                <span className="article-marks">{[0, 1, 2].map((mark) => bar('article-skel-mark', mark))}</span>
                {bar('article-skel-time')}
              </div>
              {bar('article-skel-line')}
              {bar('article-skel-line is-short')}
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

const EMAIL = 'mateus@fontes-lab.com'

/** The site's kicker pill with its running border light (kicker.ts). */
function Kicker({ children }: { children: string }) {
  const pill = useRef<HTMLSpanElement>(null)
  useEffect(() => (pill.current ? mountKicker(pill.current) : undefined), [])
  return (
    <span className="m-kick" ref={pill}>
      <i className="m-kick-glow" aria-hidden="true" />
      <span className="m-kick-plate">{children}</span>
    </span>
  )
}

/** fonteslabs.com's footer plate (fontes-spa Footer.astro, mono): the open-collaboration call and the coverage links. */
function Footer() {
  return (
    <footer className="m-foot">
      <div className="m-foot-panel">
        <img className="m-foot-art" src="/art/arches.png" alt="" />
        <section className="m-foot-development" aria-labelledby="footer-development">
          <div>
            <Kicker>Plataforma em desenvolvimento</Kicker>
            <h2 id="footer-development">Colaborações abertas</h2>
            <p>Procuram-se colaborações editoriais, técnicas e institucionais para as próximas fases da Fontes.</p>
          </div>
          <a className="m-cta" href={`mailto:${EMAIL}?subject=Proposta%20de%20colabora%C3%A7%C3%A3o`}>
            Propor colaboração
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10M7 17 17 7" /></svg>
          </a>
        </section>
        <section className="m-foot-coverage" aria-label="Cobertura em desenvolvimento">
          <p>Fontes, temas e eventos ainda não representados podem ser sinalizados por correio eletrónico.</p>
          <nav aria-label="Contributos para a cobertura">
            <a href={`mailto:${EMAIL}?subject=Fonte%20em%20falta`}>Sinalizar fonte</a>
            <a href={`mailto:${EMAIL}?subject=Sugest%C3%A3o%20de%20tema`}>Sugerir tema</a>
            <a href={`mailto:${EMAIL}?subject=Contributo%20para%20a%20Fontes`}>Outro contributo</a>
          </nav>
        </section>
      </div>
    </footer>
  )
}

const favicon = (url: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(url))}&sz=64`

/** fonteslabs.com's clips strip: the pictured articles as 16:10 cards that scroll by hand; an article without a picture is not shown. */
function Clips({ articles }: { articles: Clip[] }) {
  const pictured = uniqueClips(articles).filter((clip) => clip.image)
  if (!pictured.length) return null
  return (
    <section className="m-clips" aria-label="Publicações">
      <ul className="m-clips-track">
          {pictured.map((clip, index) => (
            <li className="m-clip" key={clip.url}>
              <a href={clip.url} target="_blank" rel="noreferrer">
                <img
                  src={clip.image!}
                  alt=""
                  width={800}
                  height={500}
                  loading={index < 3 ? undefined : 'lazy'}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(event) => event.currentTarget.removeAttribute('src')}
                />
                <span className="m-clip-source">
                  <img src={favicon(clip.url)} alt="" width={16} height={16} loading="lazy" decoding="async" />
                  {clip.source}
                </span>
                <span className="m-clip-title">{clip.title ?? host(clip.url)}</span>
              </a>
            </li>
          ))}
      </ul>
    </section>
  )
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The surface forms a mention can take, longest first so they win where they overlap. */
// ponytail: the display name and a person's surname; use the engine's alias table once the API sends it.
const entityForms = (entities: Entity[]) =>
  entities
    .flatMap((entity) => {
      const surname = entity.kind === 'person' ? entity.name.split(' ').at(-1) : undefined
      return [entity.name, ...(surname && surname.length > 2 ? [surname] : [])].map((form) => ({ form, entity }))
    })
    .sort((a, b) => b.form.length - a.form.length)

/** Whole-word, case-insensitive match of any of the forms. */
const formsPattern = (forms: { form: string }[], flags: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${forms.map((f) => escapeRegExp(f.form)).join('|')})(?![\\p{L}\\p{N}])`, flags)

/** Wraps every mention of an entity in the text; longer names win where they overlap. */
function markEntities(text: string, entities: Entity[]): React.ReactNode[] {
  const forms = entityForms(entities)
  if (!forms.length) return [text]
  const pattern = formsPattern(forms, 'giu')
  const nodes: React.ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0
    const found = forms.find((f) => f.form.toLowerCase() === match[0].toLowerCase())
    nodes.push(
      text.slice(last, at),
      <span key={at} className="article-entity" title={found && KIND_LABEL[found.entity.kind]}>
        {match[0]}
      </span>,
    )
    last = at + match[0].length
  }
  nodes.push(text.slice(last))
  return nodes
}

const longDay = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

/** One event or story as a plain news article: the date, the headline, the clips, the summary with the key entities dotted. */
export default function Article({ kind, itemKey }: { kind: 'events' | 'stories'; itemKey: string }) {
  const [page, setPage] = useState<Page | 'missing' | 'failed' | null>(null)
  const [shareLabel, setShareLabel] = useState('Partilhar')

  /** fontes-spa's share: the native sheet where there is one, else the link goes to the clipboard. */
  const share = async () => {
    if (!page || typeof page === 'string') return
    const shareData = { title: page.title, url: location.href }
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        return
      }
      await navigator.clipboard.writeText(shareData.url)
      setShareLabel('Ligação copiada')
      setTimeout(() => setShareLabel('Partilhar'), 2000)
    } catch {
      // the user closed the sheet, or the clipboard was unavailable
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API}/${kind}/${encodeURIComponent(itemKey)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((detail) => setPage(kind === 'events' ? fromEvent(detail as EventDetail) : fromStory(detail as StoryDetail)), (error: unknown) => {
        if ((error as Error)?.name !== 'AbortError') setPage(error === 404 ? 'missing' : 'failed')
      })
    return () => controller.abort()
  }, [kind, itemKey])

  return (
    <main className="make-shell">
      <header className="make-header">
        <div className="make-rail">
          <a
            className="make-brand"
            href="/"
            aria-label="Fontes, página inicial"
            onClick={(click) => {
              click.preventDefault()
              navigate('/')
            }}
          >
            <img className="make-mark" src="/mark.png" alt="" width={34} height={34} />
            <span aria-hidden="true">Fontes</span>
          </a>
        </div>
      </header>
      <article className="article">
        {page === 'missing' ? (
          <p className="article-empty">Não foi encontrada esta história</p>
        ) : page === 'failed' ? (
          <p className="article-empty">Não foi possível carregar a história</p>
        ) : page ? (
          <>
            {/* the story column, with the events beside it from the headline down on a desk and under it on a phone */}
            <div className="article-main">
              <div className="article-nav">
                <a
                  className="m-cta m-cta--dark article-back"
                  href="/"
                  onClick={(click) => {
                    click.preventDefault()
                    navigate('/')
                  }}
                >
                  <svg viewBox="0 0 20 20"><path d="m8.3 4.8-5.2 5.2 5.2 5.2M3.1 10h13.8" /></svg>
                  Voltar
                </a>
                <time className="article-date" dateTime={page.date}>{longDay.format(new Date(page.date))}</time>
              </div>
              <h1>{page.title}</h1>
              <Clips articles={page.articles} />
              {page.paragraphs.map((paragraph) => (
                <p className="article-lede" key={paragraph}>{markEntities(paragraph, page.entities)}</p>
              ))}
              <Mentions entities={page.entities} articles={page.articles} />
              <button className="m-cta m-cta--dark article-share" type="button" onClick={() => void share()}>
                {shareLabel}
                <svg viewBox="0 0 20 20"><path d="M14.5 6.5 10 2 5.5 6.5M10 2v11M4 11v5h12v-5" /></svg>
              </button>
            </div>
            <Events events={page.events} />
          </>
        ) : (
          <Skeleton />
        )}
      </article>
      <Footer />
    </main>
  )
}
