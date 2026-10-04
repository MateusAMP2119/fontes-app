import { NEWS_API } from './api'
import type { Story } from './Feed'
import type { ContentKind } from './feedResearch'
export type PreviewStory = Story & { href?: string; external?: boolean }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
/** The content picker uses the engine's corresponding search collection. */
export async function searchFeedPreview(terms: string[], kind: Exclude<ContentKind, 'all'>, seconds: number, signal: AbortSignal): Promise<{ stories: PreviewStory[] }> {
  const since = Math.floor(Date.now() / 1000) - seconds
  const batches = await Promise.all(terms.map(async q => {
    const url = new URL(`${NEWS_API}/search`)
    url.searchParams.set('q', q); url.searchParams.set('since', String(since)); url.searchParams.set('limit', '20')
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) })
    if (!response.ok) throw new Error('SEARCH_UNAVAILABLE')
    const data: unknown = await response.json()
    if (!record(data) || !Array.isArray(data[kind])) throw new Error('INVALID_SEARCH')
    return data[kind] as unknown[]
  }))
  const stories: PreviewStory[] = [], seen = new Set<number>()
  for (const item of batches.flat()) {
    if (!record(item) || !Number.isSafeInteger(item.id) || typeof item.title !== 'string' || seen.has(item.id as number)) continue
    seen.add(item.id as number)
    const date = String(item.latest_at ?? item.discovered_at ?? '')
    if (!Number.isFinite(Date.parse(date))) continue
    const sourceRows = Array.isArray(item.sources) ? item.sources : [{ name: item.source, host: item.host }]
    const sources = sourceRows.filter(record).filter(s => typeof s.name === 'string').map(s => ({ name: String(s.name), host: typeof s.host === 'string' ? s.host : null }))
    const target = kind === 'articles' ? item.url : kind === 'events' ? record(item.story) && Number.isSafeInteger(item.story.id) && item.story.title ? `/historias/${item.story.id}` : `${NEWS_API}/events/${item.id}` : `/historias/${item.id}`
    if (typeof target !== 'string' || (!target.startsWith('/historias/') && !/^https?:\/\//.test(target))) continue
    stories.push({ id: item.id as number, title: item.title, description: String(item.description ?? item.summary ?? ''), slug: typeof item.slug === 'string' ? item.slug : null,
      first_at: String(item.first_at ?? date), latest_at: date, sources, source_count: sources.length, article_count: Number(item.article_count) || 1, event_count: Number(item.event_count) || 1,
      image: typeof item.image === 'string' ? item.image : null, href: target, external: target.startsWith('http') })
  }
  return { stories: stories.slice(0, 20) }
}
