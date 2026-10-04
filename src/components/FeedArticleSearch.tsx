import { useEffect, useState } from 'react'
import { searchFeedPreview, type PreviewStory } from '../feedPreviewSearch'
import { retryRead } from '../retryRead'
import { transitionView } from '../viewTransition'

const date = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', timeZone: 'Europe/Lisbon' })
const DAYS = 7

/** Articles matching the submitted query in the news search collection. */
export default function FeedArticleSearch({ query }: { query: string }) {
  const [result, setResult] = useState<{ query: string; articles: PreviewStory[] }>()
  useEffect(() => {
    if (!query) return
    const controller = new AbortController()
    void retryRead(() => searchFeedPreview([query], 'articles', DAYS * 86400, controller.signal), controller.signal).then(data => {
      if (!controller.signal.aborted) transitionView(() => { if (!controller.signal.aborted) setResult({ query, articles: data.stories }) })
    }).catch(() => {})
    return () => controller.abort()
  }, [query])

  if (!query) return null
  const busy = result?.query !== query
  return <>
    <div className="fr-query-bubble">{query}</div>
    <section className="fr-answer" aria-label="Artigos encontrados" aria-busy={busy}>
      {/* Loaded articles stay visible while the next query is read. */}
      {!result ? <div className="fr-skeleton" aria-label="Pesquisa em curso"><span /><span /><span /></div>
        : result.articles.length ? <ol className="fr-source-list">{result.articles.map((article, index) => <li key={article.id}>
          <a href={article.href} target="_blank" rel="noreferrer"><span>{index + 1}</span><div><strong>{article.title}</strong><small>{[article.sources[0]?.name, date.format(new Date(article.latest_at))].filter(Boolean).join(' · ')}</small></div></a>
        </li>)}</ol>
        : <p className="fr-session">Sem artigos nos últimos {DAYS} dias.</p>}
    </section>
  </>
}
