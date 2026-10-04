import { NEWS_API } from './api'
import type { Story } from './Feed'

export type ResearchTopic = { id: number; title: string }
const TOPIC_LIMIT = 6

async function read(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${NEWS_API}${path}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
  })
  if (!response.ok) throw new Error('TOPICS_UNAVAILABLE')
  return response.json()
}

async function highlights(signal: AbortSignal): Promise<ResearchTopic[]> {
  const data = await read('/briefing-facts', signal) as { highlights?: { story_id: number; title: string }[] }
  if (!Array.isArray(data?.highlights) || !data.highlights.every(story =>
    story && Number.isSafeInteger(story.story_id) && typeof story.title === 'string' && story.title.trim(),
  )) throw new Error('INVALID_TOPICS')
  return data.highlights.map(story => ({ id: story.story_id, title: story.title }))
}

/** Temporary source: six unique headlines, with the briefing highlights first. */
export async function loadResearchTopics(signal: AbortSignal): Promise<ResearchTopic[]> {
  const [data, top] = await Promise.all([
    read(`/stories?limit=${TOPIC_LIMIT}`, signal),
    highlights(signal),
  ])
  if (!Array.isArray(data) || !data.every(story => story && Number.isSafeInteger(story.id)
    && typeof story.title === 'string' && story.title.trim())) throw new Error('INVALID_TOPICS')
  const seen = new Set<number>()
  return [...top, ...data as ResearchTopic[]].filter(story => {
    if (seen.has(story.id)) return false
    seen.add(story.id)
    return true
  }).slice(0, TOPIC_LIMIT).map(story => ({ id: story.id, title: story.title.trim().replaceAll('\u2014', ',') }))
}

/** Resolve the ranked highlights to the same complete records used by the standard feed. */
export async function loadResearchTopStories(signal: AbortSignal): Promise<Story[]> {
  const top = await loadResearchTopics(signal)
  return Promise.all(top.slice(0, 4).map(async topic => {
    const data = await read(`/stories?limit=20&q=${encodeURIComponent(topic.title)}`, signal)
    if (!Array.isArray(data)) throw new Error('INVALID_TOP_STORIES')
    const story = data.find(item => item?.id === topic.id) as Story | undefined
    if (!story || typeof story.title !== 'string' || !Number.isFinite(Date.parse(story.latest_at))
      || !Number.isFinite(Date.parse(story.first_at)) || !Array.isArray(story.sources)) throw new Error('INVALID_TOP_STORY')
    return story
  }))
}
