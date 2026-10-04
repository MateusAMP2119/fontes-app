import type { ArticleActivity } from './ArticleActivityChart'
import type { Story } from './Feed'
import { NEWS_API } from './api'

type PageFeed = { period: { from: number; until: number }; stories: Story[]; total_articles: number; activity: ArticleActivity[] }
type Entry = { savedAt: number; data: PageFeed }
const storageKey = `fontes:page-feed:v2:${NEWS_API}`
const entries = new Map<string, Entry>()
const requests = new Map<string, { expires: number; promise: Promise<PageFeed> }>()
const lifetime = 5 * 60 * 1000
let semanticSupported: boolean | undefined
const keyFor = (queries: string[], seconds: number) => JSON.stringify([[...new Set(queries.map(q => q.trim()).filter(Boolean))].sort(), seconds])
let restored = false

export function cachedPageFeed(queries: string[], seconds: number): PageFeed | undefined {
  if (!restored) {
    restored = true
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]')
      if (Array.isArray(saved)) for (const [key, entry] of saved) {
        const data = entry?.data
        if (typeof key === 'string' && Number.isFinite(entry.savedAt) && Array.isArray(data?.stories)
          && data.stories.every((story: Story) => Number.isSafeInteger(story.id) && typeof story.title === 'string' && typeof story.latest_at === 'string' && Array.isArray(story.sources))
          && Number.isSafeInteger(data.total_articles) && data.total_articles >= 0
          && Number.isFinite(data.period?.from) && Number.isFinite(data.period?.until)
          && Array.isArray(data.activity) && data.activity.every((point: ArticleActivity) => Number.isSafeInteger(point.count) && point.count >= 0)
          && data.activity.reduce((sum: number, point: ArticleActivity) => sum + point.count, 0) === data.total_articles) entries.set(key, entry)
      }
    } catch { /* Ignore unavailable or obsolete session data. */ }
  }
  const entry = entries.get(keyFor(queries, seconds))
  return entry && Date.now() - entry.savedAt < lifetime ? entry.data : undefined
}

/** Called only after the feed response has passed its period/activity validation. */
export function savePageFeed(queries: string[], data: PageFeed) {
  entries.set(keyFor(queries, data.period.until - data.period.from), { savedAt: Date.now(), data })
  while (entries.size > 20) entries.delete(entries.keys().next().value!)
  try { sessionStorage.setItem(storageKey, JSON.stringify([...entries])) } catch { /* Memory cache remains available. */ }
}

/** Concurrent mounted views share public news reads; one unmount cannot abort another. */
export function readPageFeed(url: string): Promise<PageFeed> {
  const existing = requests.get(url)
  if (existing && existing.expires > Date.now()) return existing.promise
  const promise = fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) }).then(response => {
    if (!response.ok) throw new Error(`${response.status}`)
    return response.json() as Promise<PageFeed>
  }).catch(error => { requests.delete(url); throw error })
  if (requests.size >= 100) requests.delete(requests.keys().next().value!)
  requests.set(url, { expires: Date.now() + lifetime, promise })
  return promise
}

/** Shared by the visible feed and eager period reads, including response validation. */
export async function loadPageFeed(queries: string[], period: PageFeed['period'], offset = 0): Promise<PageFeed> {
  const topics = [...new Set(queries.map(q => q.trim()).filter(Boolean))].sort()
  const params = new URLSearchParams({ from: String(period.from), until: String(period.until), topics: JSON.stringify(topics), limit: '20', offset: String(offset) })
  const seconds = period.until - period.from
  const bucketSeconds = seconds === 86400 ? 3600 : seconds === 7 * 86400 ? 43200 : 86400
  if (bucketSeconds === 43200) params.set('bucket_seconds', '43200')
  const intent = topics.join('; ')
  if (intent && semanticSupported !== false) params.set('q', intent)
  let url = `${NEWS_API}/page-feed?${params}`
  let data: PageFeed
  try {
    data = await readPageFeed(url)
    if (intent) semanticSupported = true
  } catch (error) {
    if (!intent || semanticSupported === true || !(error instanceof Error) || error.message !== '400') throw error
    semanticSupported = false
    params.delete('q')
    url = `${NEWS_API}/page-feed?${params}`
    data = await readPageFeed(url)
  }
  try {
    if (!Array.isArray(data.stories) || !Number.isSafeInteger(data.total_articles) || data.total_articles < 0
      || data.period?.from !== period.from || data.period?.until !== period.until) throw new Error('INVALID_PAGE_FEED')
    if (!Array.isArray(data.activity) || data.activity.length !== seconds / bucketSeconds
      || data.activity.some((point, i) => !Number.isSafeInteger(point.count) || point.count < 0
        || (point.events !== undefined && (!Number.isSafeInteger(point.events) || point.events < 0))
        || point.at !== period.from + i * bucketSeconds)
      || data.activity.reduce((sum, point) => sum + point.count, 0) !== data.total_articles) throw new Error('INVALID_ACTIVITY')
  } catch (error) {
    requests.delete(url)
    throw error
  }
  if (offset === 0) savePageFeed(topics, data)
  return data
}
