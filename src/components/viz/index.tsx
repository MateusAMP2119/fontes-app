import type { ComponentType } from 'react'
import type { VizItem, VizMetric } from '../../items/items'
import { findEvent, type NewsEvent } from '../../news/events'
import { CoverageCard } from './cards/breakdown/BreakdownCard'
import { EntitiesCard } from './cards/entities/EntitiesCard'
import { EventsCard } from './cards/events/EventsCard'
import { EvolutionCard } from './cards/evolution/EvolutionCard'
import { NarrativesCard } from './cards/narratives/NarrativesCard'
import { ReachCard } from './cards/reach/ReachCard'
import { SentimentCard } from './cards/sentiment/SentimentCard'
import { SourcesCard } from './cards/sources/SourcesCard'
import sh from './shared/shared.module.css'

type CardProps = { item: VizItem; event: NewsEvent }

/** One self-contained card module per metric; a new metric must register here. */
const CARDS: Record<VizMetric, ComponentType<CardProps>> = {
  events: EventsCard,
  reach: ReachCard,
  sources: SourcesCard,
  sentiment: SentimentCard,
  evolution: EvolutionCard,
  coverage: CoverageCard,
  entities: EntitiesCard,
  narratives: NarrativesCard,
}

export function VizBody({ item }: { item: VizItem }) {
  const event = findEvent(item.eventId)
  if (!event) {
    return <div className={sh.missing}>Tópico indisponível</div>
  }
  const Card = CARDS[item.metric]
  return <Card item={item} event={event} />
}
