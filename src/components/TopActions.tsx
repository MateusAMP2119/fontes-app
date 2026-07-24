import { IconCloud, IconGrid, IconShare } from './icons'

export function TopActions() {
  return (
    <div className="chrome chrome-top-right" data-testid="top-actions">
      <div className="pill glass" aria-label="Share and pages">
        <button type="button" className="pill-btn" title="Collaborate" tabIndex={-1}>
          <IconCloud />
          <span className="sr-only">Collaborate</span>
        </button>
        <button type="button" className="pill-btn" title="Pages" tabIndex={-1}>
          <IconGrid />
          <span className="sr-only">Pages</span>
        </button>
      </div>
      <div className="pill glass" aria-label="Actions">
        <button type="button" className="pill-btn" title="Share" tabIndex={-1}>
          <IconShare />
          <span className="sr-only">Share</span>
        </button>
      </div>
    </div>
  )
}
