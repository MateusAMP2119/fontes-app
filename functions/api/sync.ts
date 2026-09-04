// The engine's stories-sync worker posts every summarized story here and
// the set of ids to keep; rows are upserted and the rest deleted, so the
// table always mirrors what the engine would serve.

interface StoryPayload {
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
  sources: unknown[]
}

interface SyncPayload {
  stories: StoryPayload[]
  keep?: number[]
}

const BATCH = 40

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!env.SYNC_KEY || request.headers.get('Authorization') !== `Bearer ${env.SYNC_KEY}`) {
    return new Response(null, { status: 401 })
  }
  const { stories, keep } = (await request.json()) as SyncPayload
  const upsert = env.DB.prepare(
    `INSERT INTO stories (id, slug, title, description, first_at, latest_at, summarized_at,
                          event_count, article_count, source_count, image, thumb, sources, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     ON CONFLICT(id) DO UPDATE SET
       slug = excluded.slug, title = excluded.title, description = excluded.description,
       first_at = excluded.first_at, latest_at = excluded.latest_at, summarized_at = excluded.summarized_at,
       event_count = excluded.event_count, article_count = excluded.article_count,
       source_count = excluded.source_count, image = excluded.image, thumb = excluded.thumb,
       sources = excluded.sources, synced_at = excluded.synced_at`,
  )
  const statements = stories.map((story) =>
    upsert.bind(
      story.id, story.slug, story.title, story.description, story.first_at, story.latest_at,
      story.summarized_at, story.event_count, story.article_count, story.source_count,
      story.image, story.thumb, JSON.stringify(story.sources),
    ),
  )
  if (keep) {
    statements.push(
      env.DB.prepare('DELETE FROM stories WHERE id NOT IN (SELECT value FROM json_each(?))').bind(JSON.stringify(keep)),
    )
  }
  for (let start = 0; start < statements.length; start += BATCH) {
    await env.DB.batch(statements.slice(start, start + BATCH))
  }
  return Response.json({ upserted: stories.length, kept: keep?.length ?? null })
}
