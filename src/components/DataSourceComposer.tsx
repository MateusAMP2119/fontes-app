import { useEffect, useMemo, useRef, useState } from 'react'
import { IconDatabasePlus, IconSearch, IconX } from './icons'

type SourceCategory = 'Files' | 'Database' | 'Cloud' | 'Web'

export type DataConnector = {
  id: string
  name: string
  description: string
  category: SourceCategory
  mark: string
  color: string
}

const DATA_CONNECTORS: DataConnector[] = [
  { id: 'news-stream', name: 'Fontes News Stream', description: 'Live articles, outlets, entities, and sentiment', category: 'Cloud', mark: 'FN', color: '#3e8ef7' },
  { id: 'media-metrics', name: 'Media Metrics', description: 'Reach, engagement, and source authority indices', category: 'Cloud', mark: 'MM', color: '#7259d6' },
  { id: 'excel', name: 'Excel workbook', description: 'Import tables from .xlsx and .xlsm files', category: 'Files', mark: 'XL', color: '#2f9d62' },
  { id: 'csv', name: 'Text / CSV', description: 'Load delimited files with automatic type detection', category: 'Files', mark: 'CSV', color: '#6a7687' },
  { id: 'postgres', name: 'PostgreSQL', description: 'Connect with Import or DirectQuery mode', category: 'Database', mark: 'PG', color: '#336791' },
  { id: 'sql-server', name: 'SQL Server', description: 'Import data or use a live DirectQuery connection', category: 'Database', mark: 'SQL', color: '#cc5b36' },
  { id: 'sharepoint', name: 'SharePoint folder', description: 'Combine and refresh files from a team site', category: 'Cloud', mark: 'SP', color: '#138a8a' },
  { id: 'salesforce', name: 'Salesforce', description: 'Connect objects and reports from Salesforce', category: 'Cloud', mark: 'SF', color: '#12a4d9' },
  { id: 'web-api', name: 'Web / REST API', description: 'Load JSON, HTML tables, or authenticated API data', category: 'Web', mark: 'API', color: '#d07938' },
]

const CATEGORIES = ['All', 'Files', 'Database', 'Cloud', 'Web'] as const
type CategoryFilter = (typeof CATEGORIES)[number]

type DataSourceComposerProps = {
  connectedIds: string[]
  onConnect: (connector: DataConnector) => void
  onClose: () => void
}

export function DataSourceComposer({ connectedIds, onConnect, onClose }: DataSourceComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('All')

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return DATA_CONNECTORS.filter((connector) => {
      const inCategory = category === 'All' || connector.category === category
      const matches = !needle || `${connector.name} ${connector.description}`.toLowerCase().includes(needle)
      return inCategory && matches
    })
  }, [category, query])

  useEffect(() => {
    inputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="data-source-overlay" data-testid="data-source-composer">
      <div className="data-source-stack">
        <header className="data-source-head">
          <div>
            <span>Get data</span>
            <strong>Connect another source</strong>
          </div>
          <button type="button" className="pill-btn" title="Close data sources" onClick={onClose}>
            <IconX size={14} />
            <span className="sr-only">Close data sources</span>
          </button>
        </header>

        <div className="spawn-composer data-source-search">
          <IconSearch size={17} />
          <input
            ref={inputRef}
            type="search"
            className="spawn-input"
            value={query}
            placeholder="Search connectors…"
            aria-label="Search data connectors"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="spawn-scopes" role="group" aria-label="Filter data connectors">
          {CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              className={`spawn-chip${category === option ? ' is-on' : ''}`}
              aria-pressed={category === option}
              onClick={() => setCategory(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="data-source-results" role="listbox" aria-label="Data connectors">
          {results.length === 0 ? (
            <div className="spawn-empty">No connector matches “{query.trim()}”</div>
          ) : (
            results.map((connector) => {
              const connected = connectedIds.includes(connector.id)
              return (
                <button
                  key={connector.id}
                  type="button"
                  className={`data-source-row${connected ? ' is-connected' : ''}`}
                  role="option"
                  aria-selected={connected}
                  disabled={connected}
                  onClick={() => onConnect(connector)}
                >
                  <span className="data-source-mark" style={{ background: connector.color }}>
                    {connector.mark}
                  </span>
                  <span className="data-source-copy">
                    <strong>{connector.name}</strong>
                    <span>{connector.description}</span>
                  </span>
                  <span className="data-source-state">
                    {connected ? 'Connected' : (
                      <>
                        <IconDatabasePlus size={15} /> Connect
                      </>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
