import { useEffect, useRef, useState } from 'react'
import { NEWS_API } from './api'
import { retryRead } from './retryRead'
import './Sentiment.css'

export type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'mixed'
type Evidence = { quote: string; voice: 'publisher' | 'quoted' | 'reported' | 'text' }
type Target = { name: string; kind: 'person' | 'org' | 'location'; entity_id: number | null; label: SentimentLabel | 'insufficient'; evidence: Evidence[] }
export type Sentiment = {
  version: string
  algorithm?: string
  scope?: 'article_text' | 'linked_articles'
  locale: 'pt-PT'
  method: 'article_tone' | 'entity_coverage'
  status: 'pending' | 'partial' | 'ready' | 'empty'
  label: SentimentLabel | null
  articles_total: number
  articles_analysed: number
  articles_classified: number
  insufficient: number
  counts: Record<SentimentLabel, number>
  analysed_at: string | null
  evidence?: Evidence[]
  targets?: Target[]
}
const number = new Intl.NumberFormat('pt-PT')
const percentage = new Intl.NumberFormat('pt-PT', { style: 'percent', maximumFractionDigits: 1 })
export const isDictionarySentiment = (value?: Sentiment) => value?.version.startsWith('pt-PT-lexicon-') ?? false

/** Pending feed metadata refreshes only while the row is visible. */
export function LiveStorySentiment({ id, value, period }: { id: string | number; value?: Sentiment; period?: { from: number; until: number } }) {
  const element = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const query = period ? `?from=${period.from}&until=${period.until}` : ''
  const url = `${NEWS_API}/sentiment/story/${encodeURIComponent(id)}${query}`
  const [result, setResult] = useState<{ url: string; value?: Sentiment }>({ url, value })
  const current = result.url === url ? result.value : value
  useEffect(() => setResult({ url, value }), [url, value])
  useEffect(() => {
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)))
    if (element.current) observer.observe(element.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!visible || (isDictionarySentiment(current) && (current?.status === 'ready' || current?.status === 'empty'))) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try {
        const next = await retryRead(async () => {
          const response = await fetch(url, { signal: controller.signal })
          if (!response.ok) throw new Error('Sentiment read unavailable')
          const data = await response.json() as { sentiment?: Sentiment }
          if (!data.sentiment) throw new Error('Sentiment missing')
          return data.sentiment
        }, controller.signal)
        if (controller.signal.aborted) return
        setResult({ url, value: next })
      } catch { /* Leaving the viewport or changing the query cancels retries. */ }
    }
    timer = setTimeout(() => void refresh(), 5000)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [url, current, visible])
  return <span ref={element} className="sentiment-live"><SentimentMeter value={current} /></span>
}

/** A three-part distribution over classified articles; missing results stay unfilled. */
export function SentimentMeter({ value }: { value?: Sentiment }) {
  if (!isDictionarySentiment(value) || !value || value.status === 'pending' || (value.status === 'partial' && !value.articles_classified)) {
    return <span className="sentiment-skeleton" aria-hidden="true" />
  }
  const { positive, neutral, negative } = value.counts
  const total = positive + neutral + negative
  if (!total) return null
  const segments = [
    { name: 'Positivo', kind: 'positive', count: positive },
    { name: 'Neutro', kind: 'neutral', count: neutral },
    { name: 'Negativo', kind: 'negative', count: negative },
  ]
  const label = segments.map(segment => `${segment.name}: ${percentage.format(segment.count / total)}`).join(' · ')
    + `. ${number.format(value.articles_analysed)} de ${number.format(value.articles_total)} artigos analisados; ${number.format(value.articles_classified)} com classificação.`
    + ' Análise lexical: SentiLex-PT.'
    + (value.scope === 'linked_articles' ? ' Tom dos artigos associados à entidade.' : '')
  return <span className="sentiment-meter" role="img" aria-label={label} title={label} tabIndex={0}>
    {segments.filter(segment => segment.count > 0).map(segment => <span
      key={segment.kind} className={`sentiment-${segment.kind}`} aria-hidden="true"
      style={{ width: `${segment.count / total * 100}%` }}
    />)}
  </span>
}
