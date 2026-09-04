// The landing feed's read: summarized stories from the `stories` table
// (fontes-spa/migrations/0005_stories.sql), newest first, served from the
// edge so a page costs one D1 read. Each first-page read then asks the
// engine to refresh the table behind the response.

interface StoryRow {
  id: number
  slug: string | null
  title: string
  description: string
  first_at: string
  latest_at: string
  summarized_at: string
  event_count: number
  article_count: number
  source_count: number
  image: string | null
  thumb: string | null
  sources: string
}

const boundedInteger = (value: string | null, fallback: number, minimum: number, maximum: number) => {
  if (value == null) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}

// The engine's API; a feed read asks it, after answering, to refresh the
// mirror in the background. Same secret as /api/sync.
const ENGINE_SYNC = 'https://api.fonteslabs.com/sync'

const refreshBehind = (env: Env) =>
  fetch(ENGINE_SYNC, { method: 'POST', headers: { Authorization: `Bearer ${env.SYNC_KEY}` } }).catch(() => undefined)

export const onRequestGet: PagesFunction<Env> = async ({ env, request, waitUntil }) => {
  const url = new URL(request.url)
  const limit = boundedInteger(url.searchParams.get('limit'), 20, 1, 100)
  const offset = boundedInteger(url.searchParams.get('offset'), 0, 0, 100_000)
  const { results } = await env.DB.prepare(
    `SELECT id, slug, title, description, first_at, latest_at, summarized_at,
            event_count, article_count, source_count, image, thumb, sources
     FROM stories
     ORDER BY latest_at DESC, id
     LIMIT ? OFFSET ?`,
  )
    .bind(limit, offset)
    .all<StoryRow>()
  const stories = results.map((row) => ({ ...row, sources: JSON.parse(row.sources) as unknown }))
  if (offset === 0 && env.SYNC_KEY) waitUntil(refreshBehind(env))
  return Response.json(stories, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' },
  })
}
