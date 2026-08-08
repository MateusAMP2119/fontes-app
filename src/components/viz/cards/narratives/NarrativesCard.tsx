import type { VizItem } from '../../../../items/items'
import type { EventCategory, NewsEvent } from '../../../../news/events'
import { narrativeImage } from '../../../../news/narrativeImages'
import { narratives } from '../../../../news/series'
import { LABEL_H, PAD } from '../../shared/charts'
import { Shell } from '../../shared/Shell'
import s from './NarrativesCard.module.css'

const ROW_H = 76

const CATEGORY_PT: Record<EventCategory, string> = {
  World: 'Mundo',
  Business: 'Economia',
  Tech: 'Tecnologia',
  Science: 'Ciência',
  Climate: 'Clima',
  Sport: 'Desporto',
  Culture: 'Cultura',
}

export function NarrativesCard({ item, event }: { item: VizItem; event: NewsEvent }) {
  const rows = narratives(event)
  const card = item.w / item.h < 1.2
  const tag = CATEGORY_PT[event.category]

  if (card) {
    const row = rows[0]
    return (
      <Shell label="Principais narrativas" variant="default" className={s.root}>
        <div className={s.single}>
          <img src={narrativeImage(event.category, row.imageIndex)} alt="" loading="lazy" />
          <div className={s.meta}>
            <span className={s.tag}>{tag}</span>
            <span className={s.counts}>
              {row.articles} artigos · {row.fontes} fontes
            </span>
          </div>
          <span className={s.title}>{row.title}</span>
          <p className={s.summary}>{row.summary}</p>
        </div>
      </Shell>
    )
  }

  const innerH = item.h - PAD * 2 - LABEL_H
  const count = Math.min(rows.length, Math.max(Math.floor(innerH / ROW_H), 1))
  return (
    <Shell label="Principais narrativas" variant="horizontal" className={s.root}>
      <ul className={s.list}>
        {rows.slice(0, count).map((row, i) => (
          <li key={row.title}>
            <img
              src={narrativeImage(event.category, row.imageIndex + i)}
              alt=""
              loading="lazy"
            />
            <div className={s.text}>
              <span className={s.tag}>{tag}</span>
              <span className={s.title}>{row.title}</span>
              <p className={s.summary}>{row.summary}</p>
              <span className={s.counts}>
                {row.articles} artigos&ensp;·&ensp;{row.fontes} fontes
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  )
}
