import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { inkPath, type ChartItem, type Item, type TableItem } from '../items/items'
import { VizSketch } from './VizSketch'

type ItemViewProps = {
  item: Item
  selected: boolean
  editing: boolean
  interactive: boolean
  onSelectOnly: (id: string) => void
  onToggleSelect: (id: string) => void
  onDragBy: (anchorId: string, dx: number, dy: number) => void
  onEdit: (id: string | null) => void
  onChange: (item: Item) => void
}

type DragState = {
  pointerId: number
  lastX: number
  lastY: number
  moved: boolean
}

export function ItemView({
  item,
  selected,
  editing,
  interactive,
  onSelectOnly,
  onToggleSelect,
  onDragBy,
  onEdit,
  onChange,
}: ItemViewProps) {
  const dragRef = useRef<DragState | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [dragging, setDragging] = useState(false)

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
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.lastX
    const dy = e.clientY - drag.lastY
    if (!drag.moved && Math.hypot(dx, dy) < 2) {
      return
    }
    if (!drag.moved) setDragging(true)
    drag.moved = true
    drag.lastX = e.clientX
    drag.lastY = e.clientY
    // Moves the whole selection when this item is part of it.
    onDragBy(item.id, dx, dy)
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    // Plain click on an already-selected item collapses the group to it.
    if (!drag.moved && !e.shiftKey && selected) {
      onSelectOnly(item.id)
    }
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
    interactive ? 'is-interactive' : '',
  ]
    .filter(Boolean)
    .join(' ')

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
        if (!interactive || item.type === 'ink' || item.type === 'chart') return
        e.stopPropagation()
        onEdit(item.id)
      }}
    >
      {renderBody(item, editing, textRef, onChange, onEdit)}
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
    case 'chart':
      return <ChartPlaceholder item={item} />
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

/** Reserved slot for a future visualization — sketches the shape, holds no data. */
function ChartPlaceholder({ item }: { item: ChartItem }) {
  return (
    <div className="item-chart-body">
      <div className="item-chart-header">
        <span className="item-chart-title">{item.title}</span>
      </div>
      <div className="item-chart-slot">
        <VizSketch kind={item.kind} className="item-chart-sketch" />
      </div>
    </div>
  )
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
