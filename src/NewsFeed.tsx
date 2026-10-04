import { cachedPageFeed, loadPageFeed } from './pageFeedCache'
import { useEffect, useRef, useState } from 'react'
import type { AuthSession } from './auth'
import Feed from './Feed'
import ArticleActivityChart, { ArticleActivityLegend, type ArticleActivity } from './ArticleActivityChart'
import Rankings from './Rankings'
import { retryRead } from './retryRead'
import { transitionView } from './viewTransition'
import './components/SegmentedControl.css'
import './NewsFeed.css'

const periods = [{ days: 1, label: '24 h' }, { days: 7, label: '7 dias' }, { days: 30, label: '30 dias' }]
const number = new Intl.NumberFormat('pt-PT')

/** Workspace filters and temporary searches configure the same news data flow. */
export default function NewsFeed({ session, queries = [], showRankings = true }: {
  session: AuthSession | null; queries?: string[]; showRankings?: boolean
}) {
  const [days, setDays] = useState(7)
  const queryKey = JSON.stringify([...new Set(queries.map(q => q.trim()).filter(Boolean))].sort())
  return <NewsFeedContent key={queryKey} session={session} queries={queries}
    days={days} onPeriodChange={setDays} showRankings={showRankings} />
}

function periodForDays(days: number) {
  const until = Math.floor(Date.now() / 1000) - 1
  return { from: until - days * 86400, until }
}

function NewsFeedContent({ days, queries, session, onPeriodChange, showRankings }: {
  days: number; queries: string[]; session: AuthSession | null; onPeriodChange: (days: number) => void; showRankings: boolean
}) {
  const feedRef = useRef<HTMLElement>(null)
  const [period, setPeriod] = useState(() => cachedPageFeed(queries, days * 86400)?.period ?? periodForDays(days))
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      // Refresh at the top, preserving the reader's position in longer feeds.
      for (let element = feedRef.current?.parentElement; element; element = element.parentElement) {
        if (element.scrollTop > 32) return
      }
      setPeriod(periodForDays(days))
    }, 5 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [days])
  const topicsKey = JSON.stringify([...new Set(queries.map(q => q.trim()).filter(Boolean))].sort())
  useEffect(() => {
    const controller = new AbortController()
    const topics: string[] = JSON.parse(topicsKey)
    // Begin every period immediately; switching also joins any read still in flight.
    for (const { days } of periods) {
      if (cachedPageFeed(topics, days * 86400)) continue
      const target = { from: period.until - days * 86400, until: period.until }
      void retryRead(() => loadPageFeed(topics, target), controller.signal).catch(() => {})
    }
    return () => controller.abort()
  }, [topicsKey, period.until])
  const [activity, setActivity] = useState<ArticleActivity[] | null>(() => cachedPageFeed(queries, days * 86400)?.activity ?? null)
  const [total, setTotal] = useState<number | null>(() => cachedPageFeed(queries, days * 86400)?.total_articles ?? null)
  return <section ref={feedRef} className="news-feed" aria-label="Feed de notícias">
    <div className="news-feed-overview">
      <div className="news-feed-controls">
        <div className="news-feed-summary">
        <div className="news-feed-total" role="status" aria-busy={total === null}>
          {total === null ? <span className="news-feed-total-skeleton" aria-label="A carregar o total de artigos" />
            : `${number.format(total)} ${total === 1 ? 'artigo' : 'artigos'}${activity?.every(point => Number.isSafeInteger(point.events)) ? ` e ${number.format(activity.reduce((sum, point) => sum + point.events!, 0))} eventos` : ''} ${days === 1 ? 'nas últimas 24 horas' : `nos últimos ${days} dias`}`}
        </div>
        <ArticleActivityLegend activity={activity} />
        </div>
        <div className="segmented-control news-feed-periods" data-days={days} role="group" aria-label="Período das notícias">
          {periods.map(option => <button type="button" key={option.days} aria-pressed={days === option.days}
            onClick={() => {
              if (days === option.days) return
              transitionView(() => {
                const cached = cachedPageFeed(queries, option.days * 86400)
                setTotal(cached?.total_articles ?? null)
                setActivity(cached?.activity ?? null)
                setPeriod(cached?.period ?? { from: period.until - option.days * 86400, until: period.until })
                onPeriodChange(option.days)
              })
            }}>{option.label}</button>)}
        </div>
      </div>
      <ArticleActivityChart activity={activity} days={days} />
      {showRankings && <Rankings session={session} days={days} />}
    </div>
    <Feed key={days} session={session} queries={queries} period={period} onTotal={setTotal} onActivity={setActivity} />
  </section>
}
