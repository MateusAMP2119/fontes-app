import { useEffect, useState } from 'react'
import { IconClock, IconDatabasePlus, IconSparkles, BarChart, Chart, Analytics, Card, TableCellsFilled } from './icons'

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
  const Component = {
    'Stacked bar': BarChart,
    'Stacked column': BarChart,
    'Clustered bar': BarChart,
    'Clustered column': BarChart,
    Line: Chart,
    Area: Chart,
    Pie: Analytics,
    Donut: Analytics,
    Card,
    Table: TableCellsFilled,
  }[type]
  return <Component size={16} />
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
