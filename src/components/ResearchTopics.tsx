import { useEffect, useState } from 'react'
import { loadResearchTopics, type ResearchTopic } from '../researchTopics'
import { retryRead } from '../retryRead'
import { transitionView } from '../viewTransition'
import { ChevronRight } from './icons'

export default function ResearchTopics({ onSelect }: { onSelect: (query: string) => void }) {
  const [topics, setTopics] = useState<ResearchTopic[]>()
  useEffect(() => {
    const controller = new AbortController()
    void retryRead(() => loadResearchTopics(controller.signal), controller.signal).then(result => {
      if (!controller.signal.aborted) transitionView(() => {
        if (!controller.signal.aborted) setTopics(result)
      })
    }).catch(() => {})
    return () => controller.abort()
  }, [])

  if (topics?.length === 0) return null
  return <div className="fr-topics" role="group" aria-label="Temas sugeridos" aria-busy={!topics}>
    <h2 className="fr-topics-heading">Começar com</h2>
    {topics?.map(topic => <button className="fr-topic" type="button" key={topic.id} onClick={() => onSelect(topic.title)}>
      <span>{topic.title}</span><ChevronRight size={16} />
    </button>)}
    {!topics && Array.from({ length: 6 }, (_, index) => <div className="fr-topic fr-topic-skeleton" key={index} aria-hidden="true"><span /></div>)}
  </div>
}
