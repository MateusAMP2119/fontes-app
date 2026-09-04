// The landing feed's read: summarized stories from the `stories` table
// (fontes-spa/migrations/0005_stories.sql), the most relevant of the past
// five days first, served from the edge so a page costs one D1 read. Each
// first-page read then asks the engine to refresh the table behind the
// response.

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
  popularity: string
  rank: number
  rank_change: number
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

// Relevance is breadth of coverage first, volume second: each outlet counts
// double an article. ponytail: two columns and a window; a scored column in
// the mirror if this needs recency decay or de-duplicated outlets.
export const onRequestGet: PagesFunction<Env> = async ({ env, request, waitUntil }) => {
  const url = new URL(request.url)
  const limit = boundedInteger(url.searchParams.get('limit'), 20, 1, 100)
  const offset = boundedInteger(url.searchParams.get('offset'), 0, 0, 100_000)
  // `rank_change` is the move from where the story stood before the latest
  // third of its coverage (the last four of its twelve popularity buckets),
  // so a story whose articles are recent climbs and a fading one drops.
  const { results } = await env.DB.prepare(
    `WITH windowed AS (
       SELECT *,
              source_count * 2 + article_count AS score,
              coalesce(json_extract(popularity, '$[8]'), 0) + coalesce(json_extract(popularity, '$[9]'), 0)
                + coalesce(json_extract(popularity, '$[10]'), 0) + coalesce(json_extract(popularity, '$[11]'), 0) AS recent
       FROM stories
       WHERE latest_at >= strftime('%Y-%m-%dT%H:%M:%S', 'now', '-5 days')
     ),
     ranked AS (
       SELECT *,
              rank() OVER (ORDER BY score DESC, latest_at DESC, id) AS rank,
              rank() OVER (ORDER BY score - recent DESC, id) AS previous_rank
       FROM windowed
     )
     SELECT id, slug, title, description, first_at, latest_at, summarized_at,
            event_count, article_count, source_count, popularity, image, thumb, sources,
            rank, previous_rank - rank AS rank_change
     FROM ranked
     ORDER BY rank
     LIMIT ? OFFSET ?`,
  )
    .bind(limit, offset)
    .all<StoryRow>()
  const stories = results.map((row) => ({
    ...row,
    popularity: JSON.parse(row.popularity) as unknown,
    sources: JSON.parse(row.sources) as unknown,
  }))
  if (offset === 0 && env.SYNC_KEY) waitUntil(refreshBehind(env))
  return Response.json(stories, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' },
  })
}
