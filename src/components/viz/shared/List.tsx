import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import s from './List.module.css'

type ListProps = {
  /** Accessible name for the table-like list. */
  label: string
  /** CSS grid tracks used inside each row. */
  columns: readonly string[]
  /** Omit for the headerless list variant. */
  header?: string[]
  /** Softens the clipped edge when more rows continue below the viewport. */
  fade?: boolean
  className?: string
  children: ReactNode
}

/**
 * Shared data-list frame. Each header/data row is one inspected layout region,
 * following the same guide treatment as graph-card regions.
 */
export function List({ label, columns, header, fade = false, className, children }: ListProps) {
  const rowsRef = useRef<HTMLDivElement>(null)
  const [fades, setFades] = useState({ top: false, bottom: false })
  const updateFades = useCallback(() => {
    const rows = rowsRef.current
    if (!rows || !fade) {
      setFades({ top: false, bottom: false })
      return
    }
    const maxScroll = rows.scrollHeight - rows.clientHeight
    const next = {
      top: maxScroll > 1 && rows.scrollTop > 1,
      bottom: maxScroll > 1 && rows.scrollTop < maxScroll - 1,
    }
    setFades((current) => current.top === next.top && current.bottom === next.bottom ? current : next)
  }, [fade])

  useEffect(() => {
    const rows = rowsRef.current
    if (!rows) return
    updateFades()
    const observer = new ResizeObserver(updateFades)
    observer.observe(rows)
    return () => observer.disconnect()
  }, [children, updateFades])

  const style = { '--list-columns': columns.join(' ') } as CSSProperties
  return (
    <div
      className={className ? `${s.list} ${className}` : s.list}
      data-list-header={header ? '' : undefined}
      data-list-fade={fade ? '' : undefined}
      data-fade-top={fades.top ? '' : undefined}
      data-fade-bottom={fades.bottom ? '' : undefined}
      role="table"
      aria-label={label}
      style={style}
    >
      {header && (
        <div className={s.headerRow} role="row">
          {header.map((cell) => (
            <span key={cell} className={s.headerCell} role="columnheader">
              {cell}
            </span>
          ))}
        </div>
      )}
      <div
        ref={rowsRef}
        className={s.rows}
        role="rowgroup"
        aria-label={`${label}: itens`}
        data-scroll-region=""
        tabIndex={0}
        onScroll={updateFades}
      >
        {children}
      </div>
    </div>
  )
}

export function ListRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className ? `${s.row} ${className}` : s.row} role="row">
      {children}
    </div>
  )
}

export function ListCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className ? `${s.cell} ${className}` : s.cell} role="cell">
      {children}
    </div>
  )
}
