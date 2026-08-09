import type { VizItem } from '../../../../items/items'
import type { NewsEvent } from '../../../../news/events'
import { topicImage } from '../../../../news/narrativeImages'
import { narratives } from '../../../../news/series'
import { SourceMarks } from '../../shared/IdentityMarks'
import { List, ListCell, ListRow } from '../../shared/List'
import { Shell } from '../../shared/Shell'
import s from './NarrativesCard.module.css'

export function NarrativesCard({ event }: { item: VizItem; event: NewsEvent }) {
  const rows = narratives(event)
  return (
    <Shell
      label="Principais narrativas"
      variant="default"
    >
      <List
        label="Principais narrativas"
        columns={['var(--narrative-media-column, 108px)', 'minmax(0, 1fr)']}
        className={s.list}
        fade
      >
        {rows.map((row, i) => (
          <ListRow key={row.title} className={s.row}>
            <ListCell className={s.imageCell}>
              <img
                src={topicImage(event, row.imageIndex + i)}
                alt=""
                loading="lazy"
              />
            </ListCell>
            <ListCell className={s.text}>
              <span className={s.eyebrow}>
                <SourceMarks sources={row.sources} />
                <span className={s.counts}>
                  {row.articles} artigos, {row.fontes} fontes
                </span>
              </span>
              <span className={s.title}>{row.title}</span>
              <p className={s.summary}>{row.summary}</p>
            </ListCell>
          </ListRow>
        ))}
      </List>
    </Shell>
  )
}
