import type { InsertableType } from '../items/items'
import { IconGridDots, IconLock, IconPen, IconPhone, IconSticky, IconTrash } from './icons'

export type Tool = 'select' | 'draw'

type BottomBarProps = {
  tool: Tool
  hasSelection: boolean
  showMobile: boolean
  showGrid: boolean
  movementLocked: boolean
  onToolChange: (tool: Tool) => void
  onInsert: (type: InsertableType) => void
  onDelete: () => void
  onToggleMobile: () => void
  onToggleGrid: () => void
  onToggleMovementLock: () => void
}

export function BottomBar({
  tool,
  hasSelection,
  showMobile,
  showGrid,
  movementLocked,
  onToolChange,
  onInsert,
  onDelete,
  onToggleMobile,
  onToggleGrid,
  onToggleMovementLock,
}: BottomBarProps) {
  return (
    <div className="chrome chrome-bottom" data-testid="bottom-bar">
      <div className="bottom-row">
        <div className="pill glass tools-pill" data-testid="tools-pill" aria-label="Tools">
          <button
            type="button"
            className="pill-btn"
            title="Delete selection"
            disabled={!hasSelection}
            // Keep the app shell's deselect-on-pointerdown from firing here,
            // otherwise the button disables itself before its click lands.
            onPointerDown={(e) => e.stopPropagation()}
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

        <div className="pill glass" aria-label="Dashboard controls">
          <button
            type="button"
            className={`pill-btn frame-btn${showGrid ? ' is-on' : ''}`}
            title="Dashboard grid"
            aria-pressed={showGrid}
            data-testid="grid-toggle"
            onClick={onToggleGrid}
          >
            <IconGridDots />
            <span className="sr-only">Dashboard grid</span>
          </button>
          <button
            type="button"
            className={`pill-btn frame-btn${movementLocked ? ' is-on' : ''}`}
            title={movementLocked ? 'Unlock dashboard movement' : 'Lock dashboard movement'}
            aria-label={movementLocked ? 'Unlock dashboard movement' : 'Lock dashboard movement'}
            aria-pressed={movementLocked}
            data-testid="movement-lock-toggle"
            onClick={onToggleMovementLock}
          >
            <IconLock locked={movementLocked} />
          </button>
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
    </div>
  )
}
