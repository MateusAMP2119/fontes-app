import {
  EditToolbar,
  type EditorView,
  type PageTheme,
  type PageTimeRange,
} from './EditToolbar'
import { IconCloud, IconShare, IconSliders } from './icons'

export type { PageTheme, PageTimeRange } from './EditToolbar'

type TopActionsProps = {
  editOpen: boolean
  editorView: EditorView
  onEditToggle: () => void
  onEditClose: () => void
  sourceCount: number
  sourcePickerOpen: boolean
  pageTheme: PageTheme
  pageTimeRange: PageTimeRange
  onOpenDataSources: () => void
  onAnalyze: () => void
  onPageThemeChange: (theme: PageTheme) => void
  onPageTimeRangeChange: (range: PageTimeRange) => void
}

export function TopActions({
  editOpen,
  editorView,
  onEditToggle,
  onEditClose,
  sourceCount,
  sourcePickerOpen,
  pageTheme,
  pageTimeRange,
  onOpenDataSources,
  onAnalyze,
  onPageThemeChange,
  onPageTimeRangeChange,
}: TopActionsProps) {
  return (
    <div className="chrome chrome-top-right" data-testid="top-actions">
      <div className={`pill glass top-edit-pill${editOpen ? ' is-edit-expanded' : ''}`}>
        <EditToolbar
          open={editOpen}
          view={editorView}
          onClose={onEditClose}
          sourceCount={sourceCount}
          sourcePickerOpen={sourcePickerOpen}
          theme={pageTheme}
          timeRange={pageTimeRange}
          onOpenDataSources={onOpenDataSources}
          onAnalyze={onAnalyze}
          onThemeChange={onPageThemeChange}
          onTimeRangeChange={onPageTimeRangeChange}
        />
        <button
          type="button"
          className={`pill-btn${editOpen ? ' is-active' : ''}`}
          title={editOpen ? 'Close card editor' : 'Edit cards'}
          aria-label={editOpen ? 'Close card editor' : 'Edit cards'}
          aria-expanded={editOpen}
          aria-pressed={editOpen}
          data-testid="edit-toolbar-toggle"
          onClick={onEditToggle}
        >
          <IconSliders />
        </button>
      </div>
      <div className="pill glass" aria-label="Share and collaboration">
        <button type="button" className="pill-btn" title="Collaborate" tabIndex={-1}>
          <IconCloud />
          <span className="sr-only">Collaborate</span>
        </button>
        <button type="button" className="pill-btn" title="Share" tabIndex={-1}>
          <IconShare />
          <span className="sr-only">Share</span>
        </button>
      </div>
    </div>
  )
}
