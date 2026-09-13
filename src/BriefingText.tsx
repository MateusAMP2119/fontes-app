import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

type Segment = { text: string; story_id?: number }

export default function BriefingText({ text, segments, pending, animate = true }: { text: string; segments?: Segment[]; pending: boolean; animate?: boolean }) {
  const reducedMotion = useReducedMotion()
  const parts = segments?.length ? segments.map(part => ({
    ...part,
    text: Number.isSafeInteger(part.story_id) && part.story_id! > 0
      ? part.text.replace(/^«([\s\S]*)»$/, '$1')
      : part.text,
  })) : [{ text }]
  const fullText = parts.map(part => part.text).join('')
  const length = fullText.length
  const complete = useRef(false)
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    if (pending || !animate || reducedMotion || complete.current) return
    let frame: number
    const start = performance.now()
    const duration = Math.min(14000, Math.max(900, length * 18)) / 1.1
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setVisible(Math.ceil(length * progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else complete.current = true
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [pending, animate, reducedMotion, length])

  let offset = 0
  const shown = pending ? 0 : !animate || reducedMotion ? length : visible
  return <div className="home-briefing-text" aria-busy={pending || shown < length}>
    {pending && <span className="sr-only" role="status" aria-label="A carregar o resumo" />}
    <p className="home-briefing-copy" aria-hidden={pending || undefined}>
      {parts.map((part, index) => {
        const count = Math.max(0, Math.min(part.text.length, shown - offset))
        offset += part.text.length
        const revealed = part.text.slice(0, count)
        return <span key={index}>
          {Number.isSafeInteger(part.story_id) && part.story_id! > 0 && count > 0
            ? <a href={`/historias/${part.story_id}`}>{revealed}</a>
            : revealed}
        </span>
      })}
      {shown < length && <span className="home-briefing-unwritten" aria-hidden="true">{fullText.slice(shown)}</span>}
    </p>
  </div>
}

export function BriefingSkeleton() {
  return <div className="home-briefing-skeleton" role="status" aria-label="A carregar o resumo">
    <span /><span /><span />
  </div>
}
