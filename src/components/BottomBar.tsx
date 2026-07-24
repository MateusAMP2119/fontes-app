import { useEffect, useMemo, useRef, useState } from 'react'
import type { ItemType } from '../items/items'
import {
  searchViz,
  VIZ_CATALOG,
  VIZ_CATEGORIES,
  type VizDef,
} from '../viz/catalog'
import {
  IconPen,
  IconPhone,
  IconPlus,
  IconSearch,
  IconSticky,
  IconTrash,
} from './icons'
import { VizSketch } from './VizSketch'

export type Tool = 'select' | 'draw'

type BottomBarProps = {
  tool: Tool
  hasSelection: boolean
  showMobile: boolean
  onToolChange: (tool: Tool) => void
  onInsert: (type: Exclude<ItemType, 'ink' | 'chart'>) => void
  onInsertViz: (viz: VizDef) => void
  onDelete: () => void
  onToggleMobile: () => void
}

export function BottomBar({
  tool,
  hasSelection,
  showMobile,
  onToolChange,
  onInsert,
  onInsertViz,
  onDelete,
  onToggleMobile,
}: BottomBarProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Opening focuses search and starts from a clean query.
  useEffect(() => {
    if (addOpen) {
      setQuery('')
      searchRef.current?.focus()
    }
  }, [addOpen])

  const searching = query.trim().length > 0
  const results = useMemo(
    () => (searching ? searchViz(query) : VIZ_CATALOG),
    [query, searching],
  )

  const insertViz = (viz: VizDef) => {
    onInsertViz(viz)
    setAddOpen(false)
  }

  const renderTile = (viz: VizDef) => (
    <button
      key={viz.id}
      type="button"
      role="listitem"
      className="viz-tile"
      title={`${viz.name} — ${viz.category}`}
      onClick={() => insertViz(viz)}
    >
      <VizSketch kind={viz.sketch} className="viz-tile-sketch" />
      <span className="viz-tile-name">{viz.name}</span>
    </button>
  )

  return (
    <div
      className={`chrome chrome-bottom${addOpen ? ' has-bar' : ''}`}
      data-testid="bottom-bar"
    >
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

        <div className={`add-t${addOpen ? ' is-open' : ''}`} data-testid="add-morph">
          {/* Bar of the T: anchored to the stem so side pills never move;
              the row's animated padding reserves its height (no overlap) */}
          <div className="add-t-bar" inert={!addOpen}>
            <div className="add-catalog">
              <div className="viz-list" role="list">
                {searching ? (
                  results.length > 0 ? (
                    <div className="viz-grid">{results.map(renderTile)}</div>
                  ) : (
                    <div className="viz-empty">
                      No visualization matches “{query.trim()}”
                    </div>
                  )
                ) : (
                  VIZ_CATEGORIES.map((category) => (
                    <section className="viz-section" key={category}>
                      <div className="viz-section-head">{category}</div>
                      <div className="viz-grid">
                        {VIZ_CATALOG.filter((v) => v.category === category).map(
                          renderTile,
                        )}
                      </div>
                    </section>
                  ))
                )}
              </div>
              <div className="add-search-row">
                <IconSearch size={15} />
                <input
                  ref={searchRef}
                  className="add-input"
                  value={query}
                  placeholder={`Search ${VIZ_CATALOG.length} visualizations`}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      // First Escape clears the query; second closes the bar.
                      e.stopPropagation()
                      if (query) setQuery('')
                      else setAddOpen(false)
                    }
                  }}
                />
                {searching && (
                  <span className="viz-count">
                    {results.length} of {VIZ_CATALOG.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stem of the T — fuses into the bar's underside while open */}
          <div className="pill glass add-stem">
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
