import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import type { Point } from '../camera/camera'
import { inkPath, type Bounds, type Item } from '../items/items'
import { ItemView } from './ItemView'
import { MobileDashboard } from './MobileDashboard'
import type { Tool } from './BottomBar'

type CanvasProps = {
  items: Item[]
  selectedIds: string[]
  editingId: string | null
  tool: Tool
  showMobile: boolean
  onSelectOnly: (id: string) => void
  onToggleSelect: (id: string) => void
  onSelectMany: (ids: string[]) => void
  onDragTo: (anchorId: string, x: number, y: number) => void
  onDragEnd: (anchorId: string) => void
  onResizeTo: (id: string, w: number, h: number) => void
  onResizeEnd: (id: string) => void
  onEdit: (id: string | null) => void
  onItemChange: (item: Item) => void
  onStroke: (points: Point[]) => void
  /** Snapped landing cell for the widget being dragged/resized. */
  gridGhost?: Bounds | null
  /** Grid cells shown while a widget drag/resize is live. */
  gridCells?: Bounds[] | null
  /** App measures the PC frame through this when building a dashboard. */
  frameRef?: RefObject<HTMLDivElement | null>
  /** Lets App park focus on the board after the composer unmounts. */
  viewportRef?: RefObject<HTMLDivElement | null>
  /** Pick-topic mode — rendered as the PC frame's content. */
  frameContent?: ReactNode
}

type Rect = { x0: number; y0: number; x1: number; y1: number }

/** Fixed board: no pan, no zoom. Items live in viewport coordinates. */
export function Canvas({
  items,
  selectedIds,
  editingId,
  tool,
  showMobile,
  onSelectOnly,
  onToggleSelect,
  onSelectMany,
  onDragTo,
  onDragEnd,
  onResizeTo,
  onResizeEnd,
  onEdit,
  onItemChange,
  onStroke,
  gridGhost,
  gridCells,
  frameRef,
  viewportRef: externalViewportRef,
  frameContent,
}: CanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const strokeRef = useRef<Point[] | null>(null)
  const [liveStroke, setLiveStroke] = useState<Point[] | null>(null)
  const marqueeRef = useRef<Rect | null>(null)
  const [marquee, setMarquee] = useState<Rect | null>(null)

  // Swallow wheel/pinch gestures so the board never scrolls or zooms.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      // The board itself is fixed, but the phone preview is a real vertical
      // viewport and must keep its native wheel/trackpad scrolling.
      if ((e.target as HTMLElement).closest('.mobile-dashboard-scroll')) return
      e.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const localPoint = (e: ReactPointerEvent): Point => {
    const rect = viewportRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // Mobile preview gestures belong to its scroll container, not to the
    // board's marquee/drawing surface underneath it.
    if ((e.target as HTMLElement).closest('.mobile-dashboard')) return

    if (tool === 'draw') {
      const point = localPoint(e)
      strokeRef.current = [point]
      setLiveStroke([point])
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    // Empty-board press: clear selection immediately, then rubber-band.
    // Item pointer-downs stopPropagation, so this only fires on empty space.
    onEdit(null)
    onSelectMany([])
    const point = localPoint(e)
    const rect = { x0: point.x, y0: point.y, x1: point.x, y1: point.y }
    marqueeRef.current = rect
    setMarquee(rect)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (strokeRef.current) {
      const point = localPoint(e)
      strokeRef.current.push(point)
      setLiveStroke([...strokeRef.current])
      return
    }
    if (marqueeRef.current) {
      const point = localPoint(e)
      const rect = { ...marqueeRef.current, x1: point.x, y1: point.y }
      marqueeRef.current = rect
      setMarquee(rect)
    }
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (strokeRef.current) {
      const points = strokeRef.current
      strokeRef.current = null
      setLiveStroke(null)
      onStroke(points)
    } else if (marqueeRef.current) {
      const r = marqueeRef.current
      marqueeRef.current = null
      setMarquee(null)
      const left = Math.min(r.x0, r.x1)
      const right = Math.max(r.x0, r.x1)
      const top = Math.min(r.y0, r.y1)
      const bottom = Math.max(r.y0, r.y1)
      if (right - left > 3 || bottom - top > 3) {
        const hit = items
          .filter(
            (it) =>
              it.x < right &&
              it.x + it.w > left &&
              it.y < bottom &&
              it.y + it.h > top,
          )
          .map((it) => it.id)
        onSelectMany(hit)
      }
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div
      ref={(el) => {
        viewportRef.current = el
        if (externalViewportRef) externalViewportRef.current = el
      }}
      className={`stage-viewport${tool === 'draw' ? ' is-drawing' : ''}`}
      data-testid="canvas-viewport"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="application"
      aria-label="Freeform board"
    >
      <div className="stage-grid" data-testid="canvas-grid" aria-hidden="true" />

      {/* Device frames — the dashboard targets. The PC frame holds
          pick-topic mode while a board is unclaimed, so aria-hidden sits on
          the individual frames rather than the wrapper. */}
      <div className={`device-frames${showMobile ? ' is-split' : ''}`}>
        <div
          ref={frameRef}
          className={`frame-pc${frameContent ? ' has-picker' : ''}`}
          data-testid="frame-pc"
          aria-hidden={frameContent ? undefined : true}
        >
          {frameContent}
        </div>
        <div
          className="frame-mobile"
          data-testid="frame-mobile"
          aria-label="Mobile dashboard preview"
        >
          {showMobile && <MobileDashboard items={items} />}
        </div>
      </div>

      <div className="stage-world" data-testid="canvas-world">
        {gridCells && (
          <div className="grid-overlay" data-testid="grid-overlay" aria-hidden="true">
            {gridCells.map((cell, i) => (
              <div
                key={i}
                className="grid-overlay-cell"
                style={{ left: cell.x, top: cell.y, width: cell.w, height: cell.h }}
              />
            ))}
          </div>
        )}
        {gridGhost && (
          <div
            className="grid-placeholder"
            data-testid="grid-placeholder"
            aria-hidden="true"
            style={{
              left: gridGhost.x,
              top: gridGhost.y,
              width: gridGhost.w,
              height: gridGhost.h,
            }}
          />
        )}
        {items.map((item) => (
          <ItemView
            key={item.id}
            item={item}
            selected={selectedIds.includes(item.id)}
            editing={item.id === editingId}
            interactive={tool === 'select'}
            onSelectOnly={onSelectOnly}
            onToggleSelect={onToggleSelect}
            onDragTo={onDragTo}
            onDragEnd={onDragEnd}
            onResizeTo={onResizeTo}
            onResizeEnd={onResizeEnd}
            onEdit={onEdit}
            onChange={onItemChange}
          />
        ))}
        {liveStroke && liveStroke.length > 0 && (
          <svg className="stage-live-stroke" aria-hidden="true">
            <path
              d={inkPath(liveStroke)}
              fill="none"
              stroke="#1d1d1f"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {marquee && (
          <div
            className="marquee"
            style={{
              left: Math.min(marquee.x0, marquee.x1),
              top: Math.min(marquee.y0, marquee.y1),
              width: Math.abs(marquee.x1 - marquee.x0),
              height: Math.abs(marquee.y1 - marquee.y0),
            }}
          />
        )}
      </div>
    </div>
  )
}
