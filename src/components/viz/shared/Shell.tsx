import type { ReactNode } from 'react'
import type { Variant } from './variant'
import s from './shared.module.css'

type ShellProps = {
  label: string
  variant: Variant
  /** Card module root class; enables `.root[data-variant] …` selectors. */
  className?: string
  labelClassName?: string
  children: ReactNode
}

export function Shell({ label, variant, className, labelClassName, children }: ShellProps) {
  return (
    <div className={className ? `${s.card} ${className}` : s.card} data-variant={variant}>
      <div className={s.labelRow}>
        <span className={labelClassName ? `${s.label} ${labelClassName}` : s.label}>{label}</span>
      </div>
      {children}
    </div>
  )
}
