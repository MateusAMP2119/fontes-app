import { useEffect, useEffectEvent, useState } from 'react'
import { cachedPageFeed, loadPageFeed } from '../pageFeedCache'
import { feedQueryTerms, filterPreview, hasFeedQuery, type FeedDraft } from '../feedBuilderState'
import { retryRead } from '../retryRead'
import { transitionView } from '../viewTransition'
import { navigate } from '../navigate'
import { searchFeedPreview, type PreviewStory } from '../feedPreviewSearch'
import type { ContentKind } from '../feedResearch'
import { Tag } from './icons'
import './FeedDiscovery.css'

const date = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', timeZone: 'Europe/Lisbon' })
type Discovery = { stories: PreviewStory[] }


export default function FeedDiscovery({ draft, onPublications, days = 7, kind = 'all' }: {
  draft: FeedDraft; days?: number; kind?: ContentKind; onPublications: (sources: string[]) => void
}) {
  const seconds = days * 86400
  const queries = feedQueryTerms(draft)
  const queryKey = JSON.stringify({ topics: [...queries].sort(), seconds, kind })
  const hasQuery = hasFeedQuery(draft)
  const [result, setResult] = useState<{ data?: Discovery; key: string; draft: FeedDraft }>(() => ({ data: hasQuery && kind === 'all' ? cachedPageFeed(queries, seconds) : undefined, key: queryKey, draft }))
  const publish = useEffectEvent((data: Discovery, key: string, signal: AbortSignal) => transitionView(() => {
    if (signal.aborted) return
    setResult({ data, key, draft })
    onPublications([...new Set(data.stories.flatMap(story => story.sources.map(source => source.name)))].sort((a, b) => a.localeCompare(b, 'pt-PT')))
  }))
  useEffect(() => {
    if (!hasQuery) return
    const controller = new AbortController()
    const { topics }: { topics: string[] } = JSON.parse(queryKey)
    const cached = kind === 'all' ? cachedPageFeed(topics, seconds) : undefined
    if (cached) publish(cached, queryKey, controller.signal)
    const load = async () => {
      const until = Math.floor(Date.now() / 1000) - 1
      try {
        const data = await retryRead<Discovery>(() => kind === 'all' ? loadPageFeed(topics, { from: until - seconds, until }) : searchFeedPreview(topics, kind, seconds, controller.signal), controller.signal)
        if (!controller.signal.aborted) publish(data, queryKey, controller.signal)
      } catch { /* Keep loaded stories or skeletons while reads retry automatically. */ }
    }
    if (!cached) void load()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load() }, 300000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [queryKey, hasQuery, seconds, kind])

  const singular = kind === 'articles' ? 'artigo' : kind === 'stories' ? 'história' : 'evento'
  const plural = kind === 'articles' ? 'artigos' : kind === 'stories' ? 'histórias' : 'eventos'
  const { data } = result
  const busy = hasQuery && (!data || result.key !== queryKey)
  const stories = hasQuery && data ? filterPreview(data.stories, result.key === queryKey ? draft : result.draft) : undefined
  return <section className="fd-context" aria-label="Pré-visualização do feed">
    <div className="fd-count" role="status" aria-busy={busy}>{busy ? <span className="fd-count-skeleton" aria-label="A carregar resultados" /> : stories ? `${stories.length} ${stories.length === 1 ? singular : plural} nos últimos ${days} dias` : 'Pré-visualização'}</div>
    <div className="fd-stories" aria-busy={busy}>
      {!hasQuery ? <p className="fd-empty-prompt">Nenhum tema selecionado.</p> : stories ? stories.length ? stories.map(story => <article className="fd-story" key={story.id}>
        <div className="fd-image">{(story.image || story.thumb) && <img src={story.thumb || story.image!} alt="" loading="lazy" onError={event => { const image = event.currentTarget; if (story.image && image.getAttribute('src') !== story.image) image.src = story.image; else image.hidden = true }} />}</div>
        <div className="fd-story-copy"><h3><a href={story.href ?? `/historias/${story.slug ?? story.id}`} target={story.external ? '_blank' : undefined} rel={story.external ? 'noreferrer' : undefined} onClick={event => { if (story.external || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(story.href ?? `/historias/${story.slug ?? story.id}`) }}>{story.title}</a></h3>
          <div className="fd-meta">{queries.filter(term => `${story.title} ${story.description}`.toLocaleLowerCase('pt-PT').includes(term.toLocaleLowerCase('pt-PT'))).slice(0, 3).map(term => <span className="fd-match" key={term}><Tag size={12} />{term}</span>)}<span>{story.sources[0]?.name || `${story.source_count} fontes`}</span><span>/</span><time dateTime={story.latest_at}>{date.format(new Date(story.latest_at))}</time></div>
          {story.description?.trim() && <p className="fd-description">{story.description}</p>}
          {story.sources.length > 1 && <p className="fd-also">Também em {story.sources.slice(1, 3).map(source => source.name).join(', ')}{story.source_count > 3 ? `, +${story.source_count - 3} fontes` : ''}</p>}
        </div>
      </article>) : <div className="fd-empty"><h3>Sem resultados para estes critérios</h3></div>
        : Array.from({ length: 4 }, (_, i) => <div className="fd-skeleton" key={i} aria-hidden="true"><span /><div><span /><span /><span /><span /></div></div>)}
    </div>
    {hasQuery && <p className="fd-preview-note">Pré-visualização por palavras-chave nos títulos e resumos de até 20 {plural}. Rascunho local.</p>}
  </section>
}
