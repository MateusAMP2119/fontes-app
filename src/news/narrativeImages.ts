/**
 * Bundled stock photos for the narratives widget, two per event category.
 * Static imports so Vite fingerprints and inlines/serves them normally.
 */

import type { EventCategory } from './events'

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
