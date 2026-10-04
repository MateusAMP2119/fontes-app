import { useEffect, useLayoutEffect, useRef, type FormEvent } from 'react'
import { ArrowUp } from './icons'
import './SegmentedControl.css'
import { mountQuery, mountQueryIcon } from './fontesSearchQuery'
import './FeedSearchBar.css'
import type { ResearchMode } from '../feedResearch'

function QueryModeIcon({ mode, active }: { mode: ResearchMode; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => canvas.current ? mountQueryIcon(canvas.current, mode, active) : undefined, [mode, active])
  return <canvas ref={canvas} data-q-icon={mode} aria-hidden="true" />
}

/** Research input with the existing Fontes mode selector. */
export default function FeedSearchBar({ value, onChange, mode, onMode, onSubmit }: {
  value: string; onChange: (value: string) => void; mode: ResearchMode; onMode: (mode: ResearchMode) => void
  onSubmit: () => void
}) {
  const root = useRef<HTMLFormElement>(null)
  const card = useRef<HTMLDivElement>(null)
  useEffect(() => card.current ? mountQuery(card.current) : undefined, [])
  useLayoutEffect(() => {
    const input = root.current?.querySelector('textarea')
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(200, Math.max(48, input.scrollHeight))}px`
    input.dispatchEvent(new Event('input'))
  }, [value])
  const submit = (event: FormEvent) => { event.preventDefault(); if (value.trim()) onSubmit() }
  return <form ref={root} className="fs-search news-search-bar" onSubmit={submit}>
    <div ref={card} className="fs-query" data-query>
      <textarea className="fs-query-input" data-q-input aria-label="Pesquisa ou pedido" value={value} onChange={event => onChange(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (value.trim()) onSubmit() }
      }} rows={2} maxLength={2000} placeholder="Notícias de energia em Espanha" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="send" />
      <div className="fs-query-bar">
        <div className="segmented-control fs-tabs" data-mode={mode} role="tablist" aria-label="Modo">
          {(['search', 'build'] as const).map((item, index) => <button type="button" className="fs-tab" data-q-mode={item} key={item} id={`fs-${item}-tab`} aria-controls={`fs-${item}-panel`} role="tab" aria-selected={mode === item} tabIndex={mode === item ? 0 : -1} onClick={() => onMode(item)} onKeyDown={event => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'search' : event.key === 'End' ? 'build' : index === 0 ? 'build' : 'search'; root.current?.querySelector<HTMLButtonElement>(`[data-q-mode="${next}"]`)?.focus(); onMode(next) }
          }}><QueryModeIcon mode={item} active={mode === item} /><span>{item === 'search' ? 'Pesquisar' : 'Construir'}</span></button>)}
        </div>
        <button className="fs-run" type="submit" disabled={!value.trim()} aria-label={mode === 'search' ? 'Executar pesquisa' : 'Construir feed'}><ArrowUp size={16} /></button>
      </div>
    </div>
  </form>
}
