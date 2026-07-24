import { useState } from 'react'
import type { ItemType } from '../items/items'
import { IconPen, IconPhone, IconPlus, IconSticky, IconTrash } from './icons'

export type Tool = 'select' | 'draw'

type BottomBarProps = {
  tool: Tool
  hasSelection: boolean
  showMobile: boolean
  onToolChange: (tool: Tool) => void
  onInsert: (type: Exclude<ItemType, 'ink'>) => void
  onDelete: () => void
  onToggleMobile: () => void
}

export function BottomBar({
  tool,
  hasSelection,
  showMobile,
  onToolChange,
  onInsert,
  onDelete,
  onToggleMobile,
}: BottomBarProps) {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="chrome chrome-bottom" data-testid="bottom-bar">
        <div className="pill glass tools-pill" data-testid="tools-pill" aria-label="Tools">
          <button
            type="button"
            className="pill-btn"
            title="Delete selection"
            disabled={!hasSelection}
            onClick={onDelete}
          >
            <IconTrash />
            <span className="sr-only">Delete selection</span>
          </button>
          <button
            type="button"
            className="pill-btn"
            title="Sticky"
            onClick={() => onInsert('sticky')}
          >
            <IconSticky />
            <span className="sr-only">Sticky</span>
          </button>
          <button
            type="button"
            className={`pill-btn${tool === 'draw' ? ' is-active' : ''}`}
            title="Draw"
            aria-pressed={tool === 'draw'}
            onClick={() => onToolChange(tool === 'draw' ? 'select' : 'draw')}
          >
            <IconPen />
            <span className="sr-only">Draw</span>
          </button>
        </div>

        <div className="pill glass" aria-label="Add">
          <button
            type="button"
            className={`pill-btn add-btn${addOpen ? ' is-open' : ''}`}
            title={addOpen ? 'Close' : 'Add'}
            aria-pressed={addOpen}
            data-testid="add-toggle"
            onClick={() => setAddOpen((prev) => !prev)}
          >
            <IconPlus />
            <span className="sr-only">{addOpen ? 'Close' : 'Add'}</span>
          </button>
        </div>

        <div className="pill glass" aria-label="Device frames">
          <button
            type="button"
            className={`pill-btn frame-btn${showMobile ? ' is-on' : ''}`}
            title="Mobile frame"
            aria-pressed={showMobile}
            data-testid="mobile-toggle"
            onClick={onToggleMobile}
          >
            <IconPhone />
            <span className="sr-only">Mobile frame</span>
          </button>
      </div>
    </div>
  )
}
