import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DotsVertical } from './icons'

type Drop = { id: string; after: boolean; top: number; left: number; width: number }
type Gesture = { x: number; y: number; startX: number; startY: number; active: boolean; nav: HTMLElement; list: HTMLElement; group: HTMLElement; drop: Drop | null }
const Grip = () => <span className="dashboard-workspace-grip" aria-hidden="true"><DotsVertical /><DotsVertical /></span>

export default function WorkspaceDragHandle({ id, name, ids, onMove }: { id: string; name: string; ids: string[]; onMove: (id: string, target: string, after: boolean) => void }) {
  const gesture = useRef<Gesture | null>(null)
  const [preview, setPreview] = useState<{ drop: Drop | null } | null>(null)
  const cancel = () => {
    gesture.current?.group.removeAttribute('data-dragging')
    gesture.current = null
    setPreview(null)
  }
  const update = () => {
    const drag = gesture.current
    if (!drag?.active) return
    const viewport = drag.nav.getBoundingClientRect()
    const list = drag.list.getBoundingClientRect()
    const bounds = { left: list.left, right: list.right, width: list.width, top: Math.max(viewport.top, list.top), bottom: Math.min(viewport.bottom, list.bottom) }
    // Identical workspace IDs may appear in Favorites, but are never drop targets
    // for the other section. Also reject pointers outside this section's bounds.
    const groups = Array.from(drag.list.querySelectorAll<HTMLElement>('[data-workspace-id]')).filter(group => group.dataset.workspaceId !== id)
    const inside = drag.x >= bounds.left && drag.x <= bounds.right && drag.y >= bounds.top && drag.y <= bounds.bottom
    const next = groups.find(group => {
      const heading = group.querySelector('.workspace-row-header')!.getBoundingClientRect()
      return drag.y < heading.top + heading.height / 2
    })
    const target = next ?? groups.at(-1)
    const rect = target?.getBoundingClientRect()
    drag.drop = inside && target && rect ? {
      id: target.dataset.workspaceId!, after: !next,
      top: Math.max(bounds.top, Math.min(bounds.bottom, next ? rect.top - 6 : rect.bottom + 6)),
      left: bounds.left + 10, width: bounds.width - 20,
    } : null
    setPreview({ drop: drag.drop })
  }
  useEffect(() => {
    if (!preview) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cancel() }
    }
    window.addEventListener('keydown', escape, true)
    let frame: number
    const scroll = () => {
      const drag = gesture.current
      if (drag?.active) {
        const bounds = drag.nav.getBoundingClientRect()
        const speed = drag.y < bounds.top + 32 ? -8 : drag.y > bounds.bottom - 32 ? 8 : 0
        if (speed && drag.x >= bounds.left && drag.x <= bounds.right) {
          const before = drag.nav.scrollTop
          drag.nav.scrollTop += speed
          if (before !== drag.nav.scrollTop) update()
        }
      }
      frame = requestAnimationFrame(scroll)
    }
    frame = requestAnimationFrame(scroll)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', escape, true) }
  // The gesture ref supplies the current pointer position without restarting auto-scroll.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!preview])
  useEffect(() => () => { gesture.current?.group.removeAttribute('data-dragging') }, [])

  return <>
    <button type="button" className="dashboard-workspace-handle" aria-label={`Mover ${name}`} aria-describedby="workspace-reorder-help"
      disabled={ids.length < 2}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return
        event.preventDefault()
        event.currentTarget.focus({ preventScroll: true })
        event.currentTarget.setPointerCapture(event.pointerId)
        gesture.current = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, active: false,
          nav: event.currentTarget.closest('nav')!, list: event.currentTarget.closest('[data-order-scope]')!, group: event.currentTarget.closest('[data-workspace-id]')!, drop: null }
      }}
      onPointerMove={event => {
        const drag = gesture.current
        if (!drag) return
        drag.x = event.clientX; drag.y = event.clientY
        if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 5) return
        drag.active = true
        drag.group.dataset.dragging = 'true'
        update()
      }}
      onPointerUp={event => {
        const drop = gesture.current?.drop
        cancel()
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        if (drop) onMove(id, drop.id, drop.after)
      }}
      onPointerCancel={cancel} onLostPointerCapture={cancel}
      onKeyDown={event => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        const target = ids[ids.indexOf(id) + (event.key === 'ArrowUp' ? -1 : 1)]
        if (target) onMove(id, target, event.key === 'ArrowDown')
      }}><Grip /></button>
    {preview?.drop && createPortal(<div className="workspace-drop-line" aria-hidden="true" style={{ left: preview.drop.left, top: preview.drop.top, width: preview.drop.width }} />, document.body)}
  </>
}
