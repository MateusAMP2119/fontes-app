import type { CSSProperties } from 'react'
import { outletIcon } from './outletIcons'
import s from './IdentityMarks.module.css'

const hueFor = (name: string) =>
  [...name].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 360, 0)

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

export function IdentityMark({ name }: { name: string }) {
  const icon = outletIcon(name)
  if (icon) {
    return (
      <span className={s.mark} title={name} aria-hidden="true">
        <img className={s.markIcon} src={icon} alt="" loading="lazy" />
      </span>
    )
  }
  const style = { '--identity-hue': hueFor(name) } as CSSProperties
  return (
    <span className={s.mark} style={style} title={name} aria-hidden="true">
      {initialsFor(name)}
    </span>
  )
}

/** Compact favicon-like stack; every supplied source remains represented. */
export function SourceMarks({ sources }: { sources: string[] }) {
  return (
    <span className={s.stack} role="img" aria-label={`Fontes: ${sources.join(', ')}`}>
      {sources.map((source) => (
        <IdentityMark key={source} name={source} />
      ))}
    </span>
  )
}
