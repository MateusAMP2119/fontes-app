/**
 * The picked card growing into the frame, right before the widgets land.
 *
 * Deliberately an explicit-rect animation rather than a layoutId morph:
 * the suggestion area is a scroll container and .stage animates `scale` on
 * mount, and both corrupt Framer's layout projection. Plain left/top/width/
 * height cannot go wrong.
 */

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { NewsEvent } from '../../news/events'

export type GhostRect = { left: number; top: number; width: number; height: number }

type BuildGhostProps = {
  event: NewsEvent
  from: GhostRect
  onDone: () => void
}

const DURATION = 0.42

export function BuildGhost({ event, from, onDone }: BuildGhostProps) {
  const reduced = useReducedMotion()
  const settled = useRef(false)

  const finish = () => {
    if (settled.current) return
    settled.current = true
    onDone()
  }

  // A hidden tab throttles rAF, so the animation may never report completion.
  // The board must still get its widgets.
  useEffect(() => {
    const timer = window.setTimeout(finish, reduced ? 200 : DURATION * 1000 + 220)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      className="build-ghost"
      data-testid="build-ghost"
      aria-hidden="true"
      initial={{ ...from, borderRadius: 10, opacity: 0.9 }}
      animate={{
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        borderRadius: 14,
        opacity: 1,
      }}
      transition={
        reduced
          ? { duration: 0.12 }
          : { duration: DURATION, ease: [0.32, 0.72, 0.28, 1] }
      }
      onAnimationComplete={finish}
    >
      <div className="build-ghost-inner">
        <span className="build-ghost-eyebrow">{event.category}</span>
        <span className="build-ghost-title">{event.title}</span>
        <span className="build-ghost-summary">{event.summary}</span>
      </div>
    </motion.div>
  )
}
