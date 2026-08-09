import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { motion } from 'motion/react'
import type { VizItem } from '../items/items'
import { VizBody } from './viz'

type Rect = { left: number; top: number; width: number; height: number }
type Size = { w: number; h: number }
type Fit = { pane: Rect; dialog: Size }

function fit(item: VizItem, pane: HTMLElement | null): Fit {
  const r = pane?.getBoundingClientRect() ?? {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  }
  const pad = r.width <= 640 ? 20 : 40
  const maxW = Math.min(920, r.width - pad * 2)
  const maxH = Math.min(620, r.height - pad * 2)
  const scale = Math.min(maxW / item.w, maxH / item.h)
  return {
    pane: { left: r.left, top: r.top, width: r.width, height: r.height },
    dialog: { w: Math.round(item.w * scale), h: Math.round(item.h * scale) },
  }
}

export function CardCloseup({
  item,
  paneRef,
  onClose,
}: {
  item: VizItem
  paneRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [{ pane, dialog }, setFit] = useState<Fit>(() => fit(item, paneRef.current))

  useLayoutEffect(() => {
    const refit = () => {
      const next = fit(item, paneRef.current)
      setFit((current) =>
        current.pane.left === next.pane.left &&
        current.pane.top === next.pane.top &&
        current.pane.width === next.pane.width &&
        current.pane.height === next.pane.height &&
        current.dialog.w === next.dialog.w &&
        current.dialog.h === next.dialog.h
          ? current
          : next,
      )
    }
    window.addEventListener('resize', refit)
    // Sidebar open/close animates the pane's width; the observer tracks it.
    const observer = new ResizeObserver(refit)
    if (paneRef.current) observer.observe(paneRef.current)
    return () => {
      window.removeEventListener('resize', refit)
      observer.disconnect()
    }
  }, [item, paneRef])

  // The card body is rendered once at its final size; only the overlay's
  // opacity changes, so text and charts never move during the transition.
  useLayoutEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const contentZoom = Math.min(dialog.w / item.w, dialog.h / item.h)

  return (
    <motion.div
      className="card-closeup-backdrop"
      data-testid="card-closeup-backdrop"
      style={pane}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'linear' }}
      onPointerDown={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        ref={dialogRef}
        className="card-closeup-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${item.title} close-up`}
        tabIndex={-1}
        style={{ width: dialog.w, height: dialog.h }}
      >
        <div className="card-closeup-card item-viz">
          <div
            className="card-closeup-content"
            style={{
              width: item.w,
              height: item.h,
              zoom: contentZoom,
            }}
          >
            <VizBody item={item} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
