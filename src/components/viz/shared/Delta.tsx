import s from './shared.module.css'

export function Delta({ value, suffix }: { value: number; suffix?: string }) {
  const down = value < 0
  return (
    <span className={down ? `${s.delta} ${s.isDown}` : s.delta}>
      {down ? '▼' : '▲'} {down ? `−${Math.abs(value)}` : `+${value}`}
      {suffix ? ` ${suffix}` : ''}
    </span>
  )
}
