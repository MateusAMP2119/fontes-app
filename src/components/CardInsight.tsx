import type { Item } from '../items/items'
import { IconPlus, IconSparkles, IconX } from './icons'

type CardInsightProps = {
  item: Item
  onClose: () => void
  onPin: (text: string) => void
}

function insightFor(item: Item) {
  const title = item.type === 'viz' ? item.title : 'Selected card'
  return {
    title,
    headline: 'The latest increase is concentrated in two contributors.',
    detail: 'Northwire and Meridian Post account for 67% of the change, while the remaining sources stayed close to their prior baseline.',
    pinText: `${title}: Northwire and Meridian Post account for 67% of the latest change; remaining sources stayed near baseline.`,
  }
}

export function CardInsight({ item, onClose, onPin }: CardInsightProps) {
  const insight = insightFor(item)

  return (
    <div className="insight-overlay" data-testid="card-insight" onPointerDown={onClose}>
      <section className="insight-panel glass" onPointerDown={(event) => event.stopPropagation()}>
        <header className="insight-head">
          <span className="insight-icon"><IconSparkles size={17} /></span>
          <div>
            <span>Analyze</span>
            <h2>Explain this visual</h2>
          </div>
          <button type="button" className="pill-btn" title="Close insight" onClick={onClose}>
            <IconX size={14} />
            <span className="sr-only">Close insight</span>
          </button>
        </header>

        <div className="insight-copy">
          <strong>{insight.headline}</strong>
          <p>{insight.detail}</p>
        </div>

        <div className="insight-waterfall" aria-label="Contribution to change">
          <span style={{ height: '28%' }}><em>Baseline</em></span>
          <span className="is-positive" style={{ height: '66%' }}><em>Northwire</em></span>
          <span className="is-positive" style={{ height: '48%' }}><em>Meridian</em></span>
          <span className="is-muted" style={{ height: '19%' }}><em>Others</em></span>
          <span className="is-total" style={{ height: '88%' }}><em>Total</em></span>
        </div>

        <footer className="insight-foot">
          <span>Generated from the fields already used by this visual</span>
          <button type="button" onClick={() => onPin(insight.pinText)}>
            <IconPlus size={14} /> Add insight to page
          </button>
        </footer>
      </section>
    </div>
  )
}
