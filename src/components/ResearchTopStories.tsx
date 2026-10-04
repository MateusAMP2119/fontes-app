import { useEffect, useState } from 'react'
import { StoryRow, StorySkeleton, type Story } from '../Feed'
import { loadResearchTopStories } from '../researchTopics'
import { retryRead } from '../retryRead'
import { transitionView } from '../viewTransition'

export default function ResearchTopStories() {
  const [stories, setStories] = useState<Story[]>()
  useEffect(() => {
    const controller = new AbortController()
    void retryRead(() => loadResearchTopStories(controller.signal), controller.signal).then(result => {
      if (!controller.signal.aborted) transitionView(() => {
        if (!controller.signal.aborted) setStories(result)
      })
    }).catch(() => {})
    return () => controller.abort()
  }, [])

  if (stories?.length === 0) return null
  return <section className="make-feed fr-top-stories" aria-label="Histórias recentes" aria-busy={!stories}>
    <h2 className="fr-topics-heading">Histórias recentes</h2>
    <div className="feed-list">
      {stories ? stories.map((story, index) => <StoryRow key={story.id} story={story} index={index} showMetrics={false} showDate={false} />)
        : Array.from({ length: 4 }, (_, index) => <StorySkeleton key={index} showMetrics={false} showDate={false} />)}
    </div>
  </section>
}
