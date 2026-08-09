import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item, VizItem, VizMetric } from '../items/items'
import { VizBody } from './viz'

type MobileDashboardProps = {
  items: Item[]
}

/** Width ÷ aspect = height. Each metric gets a readable mobile silhouette. */
const MOBILE_ASPECT: Record<VizMetric, number> = {
  events: 1.5,
  reach: 1.35,
  sources: 1.5,
  sentiment: 1.1,
  evolution: 1.15,
  coverage: 0.85,
  entities: 0.85,
  narratives: 0.72,
}

/**
 * A live, read-only mobile projection of the desktop dashboard. The cards
 * keep their data identity, but receive mobile dimensions so their existing
 * responsive renderers choose narrow/detail variants instead of preserving
 * the desktop grid geometry.
 */
export function MobileDashboard({ items }: MobileDashboardProps) {
  const stackRef = useRef<HTMLDivElement>(null)
  const [cardWidth, setCardWidth] = useState(240)

  useEffect(() => {
    const stack = stackRef.current
    if (!stack) return
    const measure = () => {
      const style = getComputedStyle(stack)
      const innerWidth =
        stack.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight)
      setCardWidth(Math.max(innerWidth, 1))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stack)
    return () => observer.disconnect()
  }, [])

  const widgets = useMemo(
    () =>
      items
        .filter((item): item is VizItem => item.type === 'viz')
        .sort((a, b) => {
          const row = (a.grid?.row ?? a.y) - (b.grid?.row ?? b.y)
          return row || (a.grid?.col ?? a.x) - (b.grid?.col ?? b.x)
        }),
    [items],
  )

  return (
    <div className="mobile-dashboard" data-testid="mobile-dashboard">
      <div
        className="mobile-dashboard-scroll"
        aria-label="Mobile dashboard cards"
        role="region"
        tabIndex={0}
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          const amount =
            event.key === 'PageDown'
              ? event.currentTarget.clientHeight * 0.8
              : event.key === 'PageUp'
                ? -event.currentTarget.clientHeight * 0.8
                : event.key === 'ArrowDown'
                  ? 48
                  : event.key === 'ArrowUp'
                    ? -48
                    : 0
          if (amount === 0) return
          event.preventDefault()
          event.stopPropagation()
          event.currentTarget.scrollBy({ top: amount, behavior: 'smooth' })
        }}
      >
        <div ref={stackRef} className="mobile-dashboard-stack">
          {widgets.length > 0 ? (
            widgets.map((item) => {
              const mobileHeight = Math.round(cardWidth / MOBILE_ASPECT[item.metric])
              const mobileItem: VizItem = {
                ...item,
                x: 0,
                y: 0,
                w: cardWidth,
                h: mobileHeight,
              }
              return (
                <article
                  key={item.id}
                  className="mobile-dashboard-card item-viz"
                  data-testid="mobile-dashboard-card"
                  style={{ height: mobileItem.h }}
                >
                  <VizBody item={mobileItem} />
                </article>
              )
            })
          ) : (
            <div className="mobile-dashboard-empty">
              Build a dashboard to see its mobile layout.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
