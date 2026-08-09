/**
 * Bundled stock photos for the narratives widget, two per event category.
 * Static imports so Vite fingerprints and inlines/serves them normally.
 */

import type { EventCategory, NewsEvent } from './events'

import habitacao0 from '../assets/topics/oe2026-habitacao/habitacao-0.jpg'
import habitacao1 from '../assets/topics/oe2026-habitacao/habitacao-1.jpg'
import habitacao2 from '../assets/topics/oe2026-habitacao/habitacao-2.jpg'
import habitacao3 from '../assets/topics/oe2026-habitacao/habitacao-3.jpg'
import habitacao4 from '../assets/topics/oe2026-habitacao/habitacao-4.jpg'
import habitacao5 from '../assets/topics/oe2026-habitacao/habitacao-5.jpg'
import pintoLuz from '../assets/topics/oe2026-habitacao/pinto-luz.jpg'
import montenegro from '../assets/topics/oe2026-habitacao/montenegro.jpg'

import business1 from '../assets/narratives/business-1.jpg'
import business2 from '../assets/narratives/business-2.jpg'
import climate1 from '../assets/narratives/climate-1.jpg'
import climate2 from '../assets/narratives/climate-2.jpg'
import culture1 from '../assets/narratives/culture-1.jpg'
import culture2 from '../assets/narratives/culture-2.jpg'
import science1 from '../assets/narratives/science-1.jpg'
import science2 from '../assets/narratives/science-2.jpg'
import sport1 from '../assets/narratives/sport-1.jpg'
import sport2 from '../assets/narratives/sport-2.jpg'
import tech1 from '../assets/narratives/tech-1.jpg'
import tech2 from '../assets/narratives/tech-2.jpg'
import world1 from '../assets/narratives/world-1.jpg'
import world2 from '../assets/narratives/world-2.jpg'

const IMAGES: Record<EventCategory, string[]> = {
  World: [world1, world2],
  Business: [business1, business2],
  Tech: [tech1, tech2],
  Science: [science1, science2],
  Climate: [climate1, climate2],
  Sport: [sport1, sport2],
  Culture: [culture1, culture2],
}

/** Stable photo for a category; `index` may be any non-negative seed. */
export function narrativeImage(category: EventCategory, index: number): string {
  const pool = IMAGES[category] ?? IMAGES.World
  return pool[index % pool.length]
}

/**
 * Real photos curated per topic (Wikimedia Commons). Only some topics have a
 * pool; everything else falls back to the category stock photos.
 */
const TOPIC_IMAGES: Record<string, string[]> = {
  'oe2026-habitacao': [habitacao0, habitacao1, habitacao2, habitacao3, habitacao4, habitacao5],
}

/** Topic-curated photo when available, category stock otherwise. */
export function topicImage(event: NewsEvent, index: number): string {
  const pool = TOPIC_IMAGES[event.id]
  if (pool) return pool[index % pool.length]
  return narrativeImage(event.category, index)
}

/** Entity-specific photos for curated topics, keyed by the entity label. */
const TOPIC_ENTITY_IMAGES: Record<string, Record<string, string>> = {
  'oe2026-habitacao': {
    'Miguel Pinto Luz': pintoLuz,
    'Luís Montenegro': montenegro,
    'IHRU': habitacao5,
    'Assembleia da República': habitacao0,
    'Associação Portuguesa de Bancos': habitacao3,
    'Associação Nacional de Municípios': habitacao4,
    'Associação dos Inquilinos Lisbonenses': habitacao1,
    'APPII': habitacao2,
  },
}

/** Photo for an entity row: exact match first, topic pool as fallback. */
export function entityImage(event: NewsEvent, label: string, index: number): string {
  return TOPIC_ENTITY_IMAGES[event.id]?.[label] ?? topicImage(event, index)
}
