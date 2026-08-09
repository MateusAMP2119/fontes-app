import { useEffect, useState } from 'react'
import { IconClock, IconDatabasePlus, IconSparkles } from './icons'

export type EditorView = 'page' | 'card'
export type PageTheme = 'light' | 'warm' | 'cool'
export type PageTimeRange = '24h' | '7d' | '30d' | 'all'

/* ponytail: static demo data — wire to the selected card if this ever ships */
const VISUAL_TYPES = [
  'Stacked bar',
  'Stacked column',
  'Clustered bar',
  'Clustered column',
  'Line',
  'Area',
  'Pie',
  'Donut',
  'Card',
  'Table',
] as const

function VisualGlyph({ type }: { type: (typeof VISUAL_TYPES)[number] }) {
  const fill = { fill: 'currentColor' }

  switch (type) {
    case 'Stacked bar':
      return (
        <svg viewBox="0 0 16 16" {...fill}>
          <rect x="1" y="2" width="10" height="3" />
          <rect x="1" y="6.5" width="13" height="3" />
          <rect x="1" y="11" width="7" height="3" />
        </svg>
      )
    case 'Stacked column':
      return (
        <svg viewBox="0 0 16 16" {...fill}>
          <rect x="2" y="5" width="3" height="10" />
          <rect x="6.5" y="1" width="3" height="14" />
          <rect x="11" y="8" width="3" height="7" />
        </svg>
      )
    case 'Clustered bar':
      return (
        <svg viewBox="0 0 16 16" {...fill}>
          <rect x="1" y="1" width="11" height="2.4" />
          <rect x="1" y="4" width="6" height="2.4" />
          <rect x="1" y="9" width="13" height="2.4" />
          <rect x="1" y="12" width="8" height="2.4" />
        </svg>
      )
    case 'Clustered column':
      return (
        <svg viewBox="0 0 16 16" {...fill}>
          <rect x="1.5" y="6" width="2.6" height="9" />
          <rect x="4.6" y="3" width="2.6" height="12" />
          <rect x="9" y="8" width="2.6" height="7" />
          <rect x="12.1" y="1" width="2.6" height="14" />
        </svg>
      )
    case 'Line':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M1 12l4-5 3 3 6-7" />
        </svg>
      )
    case 'Area':
      return (
        <svg viewBox="0 0 16 16" {...fill}>
          <path d="M1 14V11l4-5 3 3 6-7v12z" />
        </svg>
      )
    case 'Pie':
      return (
        <svg viewBox="0 0 16 16" {...fill}>
          <path d="M8 1a7 7 0 1 1-7 7h7z" />
          <path d="M7 0a7 7 0 0 0-7 7h7z" opacity="0.45" />
        </svg>
      )
    case 'Donut':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="8" cy="8" r="5.5" strokeDasharray="26 9" transform="rotate(-90 8 8)" />
        </svg>
      )
    case 'Card':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
          <path d="M4 9.5h5" strokeWidth="2" />
        </svg>
      )
    case 'Table':
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="1.5" y="2" width="13" height="12" rx="1" />
          <path d="M1.5 6h13M1.5 10h13M8 2v12" />
        </svg>
      )
  }
}

function FieldChip({ label }: { label: string }) {
  return <span className="edit-chip">{label}</span>
}

type PageEditorProps = {
  sourceCount: number
  sourcePickerOpen: boolean
  theme: PageTheme
  timeRange: PageTimeRange
  onOpenDataSources: () => void
  onThemeChange: (theme: PageTheme) => void
  onTimeRangeChange: (range: PageTimeRange) => void
}

function PageEditor({
  sourceCount,
  sourcePickerOpen,
  theme,
  timeRange,
  onOpenDataSources,
  onThemeChange,
  onTimeRangeChange,
}: PageEditorProps) {
  return (
    <>
      <div className="edit-toolbar-group" aria-label="Data sources">
        <button
          type="button"
          className={`pill-btn page-source-button${sourcePickerOpen ? ' is-active' : ''}`}
          title="Get data"
          aria-label={`Get data. ${sourceCount} sources connected`}
          aria-expanded={sourcePickerOpen}
          data-testid="add-data-source"
          onClick={onOpenDataSources}
        >
          <IconDatabasePlus size={17} />
          <span className="page-source-count" aria-hidden="true">{sourceCount}</span>
        </button>
      </div>

      <div className="edit-toolbar-group page-theme-group" aria-label="Page theme">
        {(['light', 'warm', 'cool'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`pill-btn page-theme-button${theme === option ? ' is-active' : ''}`}
            title={`${option[0].toUpperCase()}${option.slice(1)} theme`}
            aria-label={`${option[0].toUpperCase()}${option.slice(1)} theme`}
            aria-pressed={theme === option}
            onClick={() => onThemeChange(option)}
          >
            <span className={`page-theme-preview is-${option}`} />
          </button>
        ))}
      </div>

      <div className="edit-toolbar-group" aria-label="Page time range">
        <label className="page-time-picker" title="Page time range">
          <IconClock size={15} />
          <select
            value={timeRange}
            aria-label="Page time range"
            onChange={(event) => onTimeRangeChange(event.target.value as PageTimeRange)}
          >
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>
    </>
  )
}

function CardEditor({ onAnalyze }: { onAnalyze: () => void }) {
  const [visual, setVisual] = useState<(typeof VISUAL_TYPES)[number]>('Clustered column')
  const [color, setColor] = useState('#3e8ef7')

  return (
    <>
      <div className="edit-toolbar-group" aria-label="Visual type">
        <div className="edit-visual-grid">
          {VISUAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              title={type}
              aria-label={type}
              aria-pressed={type === visual}
              className={`pill-btn edit-visual-button${type === visual ? ' is-active' : ''}`}
              onClick={() => setVisual(type)}
            >
              <VisualGlyph type={type} />
            </button>
          ))}
        </div>
      </div>

      <div className="edit-toolbar-group edit-toolbar-data" aria-label="Data fields">
        <div className="edit-data-row" title="X-axis">
          <FieldChip label="Month" />
        </div>
        <div className="edit-data-row" title="Y-axis">
          <FieldChip label="Revenue" />
          <FieldChip label="Forecast" />
        </div>
      </div>

      <div className="edit-toolbar-group">
        <label className="pill-btn edit-color-picker" title="Choose color">
          <span className="edit-color-preview" style={{ background: color }} />
          <input
            type="color"
            value={color}
            aria-label="Choose color"
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
      </div>

      <div className="edit-toolbar-group">
        <button
          type="button"
          className="pill-btn"
          title="Explain this visual"
          aria-label="Explain this visual"
          data-testid="analyze-card"
          onClick={onAnalyze}
        >
          <IconSparkles size={17} />
        </button>
      </div>
    </>
  )
}

type EditToolbarProps = {
  open: boolean
  view: EditorView
  onClose: () => void
  sourceCount: number
  sourcePickerOpen: boolean
  theme: PageTheme
  timeRange: PageTimeRange
  onOpenDataSources: () => void
  onAnalyze: () => void
  onThemeChange: (theme: PageTheme) => void
  onTimeRangeChange: (range: PageTimeRange) => void
}

export function EditToolbar({
  open,
  view,
  onClose,
  sourceCount,
  sourcePickerOpen,
  theme,
  timeRange,
  onOpenDataSources,
  onAnalyze,
  onThemeChange,
  onTimeRangeChange,
}: EditToolbarProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  return (
    <section
      className={`edit-toolbar${open ? ' is-open' : ''}`}
      aria-label={view === 'page' ? 'Edit page' : 'Edit card'}
      aria-hidden={!open}
      data-editor-view={view}
      data-testid="edit-toolbar"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="edit-toolbar-scroll">
        {view === 'page' ? (
          <PageEditor
            sourceCount={sourceCount}
            sourcePickerOpen={sourcePickerOpen}
            theme={theme}
            timeRange={timeRange}
            onOpenDataSources={onOpenDataSources}
            onThemeChange={onThemeChange}
            onTimeRangeChange={onTimeRangeChange}
          />
        ) : (
          <CardEditor onAnalyze={onAnalyze} />
        )}
      </div>
    </section>
  )
}
