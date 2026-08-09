import type { CSSProperties, ReactNode } from 'react'
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
  const style = { '--list-columns': columns.join(' ') } as CSSProperties
  return (
    <div
      className={className ? `${s.list} ${className}` : s.list}
      data-list-header={header ? '' : undefined}
      data-list-fade={fade ? '' : undefined}
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
        className={s.rows}
        role="rowgroup"
        aria-label={`${label}: itens`}
        data-scroll-region=""
        tabIndex={0}
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
