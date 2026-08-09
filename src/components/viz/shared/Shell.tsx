import type { CSSProperties, ReactNode } from 'react'
import type { CardColumns } from './charts'
import type { Variant } from './variant'
import s from './shared.module.css'

type ShellProps = {
  label: string
  variant: Variant
  /** Horizontal column layout; sets the body tracks and enables grid-toggle guides. */
  columns?: CardColumns
  /** Card module root class; enables `.root[data-variant] …` selectors. */
  className?: string
  labelClassName?: string
  children: ReactNode
}

export function Shell({ label, variant, columns, className, labelClassName, children }: ShellProps) {
  return (
    <div
      className={className ? `${s.card} ${className}` : s.card}
      data-variant={variant}
      data-columns={columns?.n}
      style={columns && ({ '--card-cols': columns.n } as CSSProperties)}
    >
      <div className={s.labelRow}>
        <span className={labelClassName ? `${s.label} ${labelClassName}` : s.label}>{label}</span>
      </div>
      {children}
      {columns && (
        <div className={s.guides} aria-hidden="true">
          {Array.from({ length: columns.n }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      )}
    </div>
  )
}
