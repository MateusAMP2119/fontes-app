import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import './EditableName.css'
import FadingPageName from './FadingPageName'
import { transitionView } from '../viewTransition'

export default function EditableName({ name, onSave, label = 'Nome da página', autoEdit = false, initialClickX, onFinish }: { name: string; onSave: (name: string) => void; label?: string; autoEdit?: boolean; initialClickX?: number; onFinish?: () => void }) {
  const [editing, setEditing] = useState(autoEdit)
  const [draft, setDraft] = useState(name)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const clickX = useRef(initialClickX)
  const focusInput = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node
    if (!node) return
    let offset = node.value.length
    const text = node.previousElementSibling?.firstChild
    if (clickX.current !== undefined && text?.nodeType === Node.TEXT_NODE) {
      const range = document.createRange()
      for (let index = 0; index < node.value.length; index++) {
        range.setStart(text, index)
        range.setEnd(text, index + 1)
        const bounds = range.getBoundingClientRect()
        if (clickX.current < bounds.x + bounds.width / 2) { offset = index; break }
      }
    }
    node.focus({ preventScroll: true })
    node.setSelectionRange(offset, offset)
  }, [])
  useLayoutEffect(() => {
    const input = inputRef.current
    const label = input?.previousElementSibling as HTMLElement | null
    // Native caret scrolling can retain the old offset after the draft grows or shrinks.
    if (input && label && label.scrollWidth <= input.clientWidth + 1) input.scrollLeft = 0
  }, [draft, editing])
  const finished = useRef(false)
  const start = (clientX?: number) => { clickX.current = clientX; finished.current = false; transitionView(() => { setDraft(name); setError(false); setEditing(true) }) }
  const finish = () => {
    finished.current = true
    transitionView(() => { setEditing(false); onFinish?.() })
  }
  const save = () => {
    if (finished.current) return
    const title = draft.trim()
    if (!title || title === name) { finish(); return }
    try {
      finished.current = true
      transitionView(() => {
        try { onSave(title) } catch { finished.current = false; setError(true); return }
        setEditing(false)
        onFinish?.()
      })
    } catch { finished.current = false; setError(true) }
  }
  return <span className="editable-page-name" data-editing={editing}>
    <FadingPageName disabled={editing} className="editable-page-name-label" aria-hidden={editing || undefined} tabIndex={editing ? undefined : 0} onDoubleClick={event => { const x = event.clientX + event.currentTarget.scrollLeft; event.currentTarget.scrollLeft = 0; start(x) }} onKeyDown={event => {
      if (event.key === 'F2' || event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); start() }
    }}>{editing ? draft || '\u00a0' : name || 'Sem título'}</FadingPageName>
    {editing && <input aria-label={label} maxLength={120} value={draft}
      ref={focusInput}
      onChange={event => setDraft(event.target.value)} onBlur={save}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        event.stopPropagation()
        if (event.key === 'Enter') { event.preventDefault(); save() }
        if (event.key === 'Escape') { event.preventDefault(); finish() }
      }} />}
    {error && <span role="alert">Não foi possível guardar o nome.</span>}
  </span>
}
