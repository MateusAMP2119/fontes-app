import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { inkPath, type Item, type TableItem } from '../items/items'
import { VizBody } from './viz'

type ItemViewProps = {
  item: Item
  selected: boolean
  editing: boolean
  interactive: boolean
  onSelectOnly: (id: string) => void
  onToggleSelect: (id: string) => void
  onDragTo: (anchorId: string, x: number, y: number) => void
  onDragEnd: (anchorId: string) => void
  onResizeTo: (id: string, w: number, h: number) => void
  onResizeEnd: (id: string) => void
  onEdit: (id: string | null) => void
  onChange: (item: Item) => void
}

/**
 * Drags report absolute positions (origin + total pointer travel) rather
 * than deltas: the board needs to know where the card *would* be even while
 * the grid engine is snapping it elsewhere, and deltas cannot be un-snapped.
 */
type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

type ResizeAxis = 'e' | 's' | 'se'

type ResizeState = {
  pointerId: number
  startX: number
  startY: number
  originW: number
  originH: number
  axis: ResizeAxis
}

/** Below this a widget is unreadable; the grid clamps to spans anyway. */
const MIN_RESIZE = 48

export function ItemView({
  item,
  selected,
  editing,
  interactive,
  onSelectOnly,
  onToggleSelect,
  onDragTo,
  onDragEnd,
  onResizeTo,
  onResizeEnd,
  onEdit,
  onChange,
}: ItemViewProps) {
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)

  useEffect(() => {
    if (editing) textRef.current?.focus()
  }, [editing])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || editing || e.button !== 0) return
    e.stopPropagation()
    if (e.shiftKey) {
      // Shift-click toggles membership; removing never starts a drag.
      onToggleSelect(item.id)
      if (selected) return
    } else if (!selected) {
      onSelectOnly(item.id)
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: item.x,
      originY: item.y,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    // 5px dead zone so a click's micro-wiggle doesn't flash the drag
    // lift (scale + drop-shadow) or the grid overlay.
    if (!drag.moved && Math.hypot(dx, dy) < 5) {
      return
    }
    if (!drag.moved) setDragging(true)
    drag.moved = true
    // Moves the whole selection when this item is part of it.
    onDragTo(item.id, drag.originX + dx, drag.originY + dy)
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    // Dropped after a real move — let the board snap it into place.
    if (drag.moved) {
      onDragEnd(item.id)
    }
    // Plain click on an already-selected item collapses the group to it.
    if (!drag.moved && !e.shiftKey && selected) {
      onSelectOnly(item.id)
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const startResize = (e: ReactPointerEvent<HTMLDivElement>, axis: ResizeAxis) => {
    if (!interactive || e.button !== 0) return
    e.stopPropagation()
    resizeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originW: item.w,
      originH: item.h,
      axis,
    }
    setResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const moveResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rs = resizeRef.current
    if (!rs || rs.pointerId !== e.pointerId) return
    e.stopPropagation()
    const dw = rs.axis === 's' ? 0 : e.clientX - rs.startX
    const dh = rs.axis === 'e' ? 0 : e.clientY - rs.startY
    onResizeTo(item.id, Math.max(MIN_RESIZE, rs.originW + dw), Math.max(MIN_RESIZE, rs.originH + dh))
  }

  const endResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rs = resizeRef.current
    if (!rs || rs.pointerId !== e.pointerId) return
    e.stopPropagation()
    resizeRef.current = null
    setResizing(false)
    onResizeEnd(item.id)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const style: CSSProperties = {
    left: item.x,
    top: item.y,
    width: item.w,
    height: item.type === 'text' ? undefined : item.h,
    minHeight: item.type === 'text' ? item.h : undefined,
    background: item.type === 'sticky' ? item.color : undefined,
  }

  const className = [
    'item',
    `item-${item.type}`,
    selected ? 'is-selected' : '',
    editing ? 'is-editing' : '',
    dragging ? 'is-dragging' : '',
    resizing ? 'is-resizing' : '',
    interactive ? 'is-interactive' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Only dashboard widgets live on the grid, so only they resize. Handles
  // stay mounted so deselection can fade them out in CSS.
  const showHandles = item.type === 'viz' && interactive

  return (
    <div
      className={className}
      style={style}
      data-testid={`item-${item.type}`}
      data-item-id={item.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={(e) => {
        // Ink and widgets have no text editor to enter.
        if (!interactive || item.type === 'ink' || item.type === 'viz') return
        e.stopPropagation()
        onEdit(item.id)
      }}
    >
      {renderBody(item, editing, textRef, onChange, onEdit)}
      {showHandles &&
        (['e', 's', 'se'] as const).map((axis) => (
          <div
            key={axis}
            className={`item-handle is-${axis}`}
            data-testid={`resize-${axis}`}
            onPointerDown={(e) => startResize(e, axis)}
            onPointerMove={moveResize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
          />
        ))}
    </div>
  )
}

function renderBody(
  item: Item,
  editing: boolean,
  textRef: React.RefObject<HTMLTextAreaElement | null>,
  onChange: (item: Item) => void,
  onEdit: (id: string | null) => void,
) {
  switch (item.type) {
    case 'text':
    case 'sticky':
    case 'note': {
      if (editing) {
        return (
          <textarea
            ref={textRef}
            className="item-editor"
            value={item.text}
            placeholder={placeholderFor(item.type)}
            onChange={(e) => onChange({ ...item, text: e.target.value })}
            onBlur={() => onEdit(null)}
            onPointerDown={(e) => e.stopPropagation()}
          />
        )
      }
      return (
        <div className={`item-text-body${item.text ? '' : ' is-empty'}`}>
          {item.text || placeholderFor(item.type)}
        </div>
      )
    }
    case 'table':
      return <TableBody item={item} editing={editing} onChange={onChange} />
    case 'viz':
      return <VizBody item={item} />
    case 'ink':
      return (
        <svg
          className="item-ink-svg"
          viewBox={`0 0 ${item.w} ${item.h}`}
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <path
            d={inkPath(item.points)}
            fill="none"
            stroke={item.color}
            strokeWidth={item.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

function placeholderFor(type: 'text' | 'sticky' | 'note'): string {
  if (type === 'text') return 'Text'
  if (type === 'sticky') return 'Sticky note'
  return 'Note'
}

function TableBody({
  item,
  editing,
  onChange,
}: {
  item: TableItem
  editing: boolean
  onChange: (item: Item) => void
}) {
  const firstCellRef = useRef<HTMLInputElement>(null)

  // Entering edit mode (double-click or fresh insert) focuses the first cell.
  useEffect(() => {
    if (editing) firstCellRef.current?.focus()
  }, [editing])

  const setCell = (r: number, c: number, value: string) => {
    const cells = item.cells.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row,
    )
    onChange({ ...item, cells })
  }

  return (
    <div
      className="item-table-grid"
      style={{ gridTemplateColumns: `repeat(${item.cells[0]?.length ?? 1}, 1fr)` }}
    >
      {item.cells.map((row, r) =>
        row.map((cell, c) => (
          <input
            // eslint-disable-next-line react/no-array-index-key
            key={`${r}-${c}`}
            ref={r === 0 && c === 0 ? firstCellRef : undefined}
            className="item-table-cell"
            value={cell}
            tabIndex={editing ? 0 : -1}
            onChange={(e) => setCell(r, c, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Row ${r + 1} column ${c + 1}`}
          />
        )),
      )}
    </div>
  )
}
