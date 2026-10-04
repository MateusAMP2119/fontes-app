import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NEWS_API } from '../api'
import { retryRead } from '../retryRead'
import { transitionView } from '../viewTransition'
import type { WorkspaceFeed } from '../workspaceFeedState'
import { ArrowUp, Check, Search } from './icons'
import { mountPromptGlyph } from './fontesSearchQuery'
import './WorkspaceInspector.css'

type Suggestion = { key: string; label: string; kind: string }
export default function WorkspaceInspector({ feed, saved, change, tab, setTab }: {
  feed: WorkspaceFeed; saved: boolean; change: (patch: Partial<WorkspaceFeed>) => void
  tab: 'feed' | 'settings'; setTab: (tab: 'feed' | 'settings') => void
}) {
  const savedPrompt = feed.topics.join(' ou ')
  const [prompt, setPrompt] = useState(savedPrompt)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const glyph = useRef<HTMLCanvasElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const line = useRef<HTMLDivElement>(null)
  const lineWidth = useRef(0)
  /** One line keeps the glyph, the text and the send on a row; longer text takes the full width above them. The box's height animates between the two. */
  const fit = useCallback((animate: boolean) => {
    const input = field.current
    const box = line.current
    if (!input || !box || !box.clientWidth) return
    const from = box.offsetHeight
    const boxStyle = getComputedStyle(box)
    const inputStyle = getComputedStyle(input)
    // the row's width less the 20px glyph, the 24px send and their two 8px gaps
    const inline = box.clientWidth - parseFloat(boxStyle.paddingLeft) - parseFloat(boxStyle.paddingRight) - 60
    const ruler = document.createElement('canvas').getContext('2d')
    if (ruler) ruler.font = `${inputStyle.fontWeight} ${inputStyle.fontSize} ${inputStyle.fontFamily}`
    // Measured against the one-line width in both layouts, so the wider stacked text cannot flip it back.
    box.dataset.multiline = String(input.value.includes('\n') || (ruler?.measureText(input.value).width ?? 0) > inline)
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight}px`
    box.style.height = 'auto'
    const to = box.offsetHeight
    if (animate && from !== to) {
      box.style.height = `${from}px`
      void box.offsetHeight
    }
    box.style.height = `${to}px`
    lineWidth.current = box.clientWidth
  }, [])
  useLayoutEffect(() => fit(true), [fit, prompt, tab])
  useEffect(() => {
    const box = line.current
    if (!box) return
    // Only a width change refits; the height is the animation's own.
    const resize = new ResizeObserver(() => { if (box.clientWidth !== lineWidth.current) fit(false) })
    resize.observe(box)
    return () => resize.disconnect()
  }, [fit, tab])
  useLayoutEffect(() => glyph.current && field.current ? mountPromptGlyph(field.current, glyph.current, 'build') : undefined, [tab])
  useEffect(() => setPrompt(savedPrompt), [savedPrompt])
  useEffect(() => {
    const query = prompt.trim()
    if (tab !== 'feed' || query.length < 2 || query === savedPrompt) {
      setSuggestions([]); setSearching(false)
      return
    }
    const controller = new AbortController()
    setSearching(true)
    const timer = window.setTimeout(() => {
      void retryRead(async () => {
        const response = await fetch(`${NEWS_API}/search?q=${encodeURIComponent(query)}&limit=3`, { signal: controller.signal })
        if (!response.ok) throw new Error(String(response.status))
        const results = await response.json()
        if (!results || typeof results !== 'object') throw new Error('Invalid suggestions')
        return [
          ...(Array.isArray(results.entities) ? results.entities.map((item: { id: number; name: string }) => ({ key: `entity-${item.id}`, label: item.name, kind: 'Entidade' })) : []),
          ...(Array.isArray(results.events) ? results.events.map((item: { id: number; title: string }) => ({ key: `event-${item.id}`, label: item.title, kind: 'Evento' })) : []),
          ...(Array.isArray(results.stories) ? results.stories.map((item: { id: number; title: string }) => ({ key: `story-${item.id}`, label: item.title, kind: 'História' })) : []),
        ].filter((item, index, all) => item.label && all.findIndex(candidate => candidate.label === item.label) === index).slice(0, 5)
      }, controller.signal).then(next => {
        if (!controller.signal.aborted) transitionView(() => { setSuggestions(next); setSearching(false) })
      }).catch(() => {})
    }, 180)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [savedPrompt, prompt, tab])
  const applyPrompt = (value = prompt) => {
    const query = value.split(/\s+/).filter(Boolean).join(' ').slice(0, 600)
    transitionView(() => { change({ topics: query ? [query] : [] }); setPrompt(query); setSuggestions([]) })
  }
  return <aside className="workspace-inspector workspace-controls" aria-label="Configuração da página principal">
    <nav className="wi-tabs" aria-label="Secções de configuração">{(['feed', 'settings'] as const).map(value => <button type="button" key={value} aria-pressed={tab === value} onClick={() => transitionView(() => setTab(value))}>{value === 'feed' ? 'Feed' : 'Definições'}</button>)}</nav>
    <div className="wi-panel">
      <div className="wi-body">
        {tab === 'feed' ? <>
          <h2>Pesquisa do feed</h2>
          <p className="wi-hint">Uma descrição define o que entra no feed. Eventos, entidades e temas relacionados são encontrados por significado.</p>
        </> : <>
          <h2>Página principal</h2>
          <label className="wi-field">Título<input value={feed.title} maxLength={120} onChange={event => change({ title: event.target.value })} /></label>
          <label className="wi-field">Descrição<textarea rows={4} value={feed.description} maxLength={600} onChange={event => change({ description: event.target.value })} placeholder="Contexto e objetivo da página" /></label>
        </>}
      </div>
      {tab === 'feed' ? <div className="wi-prompt-wrap">
        {/* the news search's framed field (MakeApp.css .news-search-bar) with fonteslabs.com's prompt bar glyph and round send */}
        <form className="wi-query" onSubmit={event => { event.preventDefault(); applyPrompt() }}>
          <div ref={line} className="wi-query-line" onClick={event => { if (event.target === event.currentTarget) field.current?.focus() }}>
            <canvas ref={glyph} aria-hidden="true" />
            <textarea ref={field} rows={1} aria-label="O que acompanhar" value={prompt} maxLength={600} onChange={event => setPrompt(event.target.value)} onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); applyPrompt() }
            }} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="send" />
            <button className="wi-run" aria-label="Atualizar feed" disabled={prompt.trim() === savedPrompt}><ArrowUp size={14} color="currentColor" /></button>
          </div>
        </form>
        {(searching || suggestions.length > 0) && <div className="wi-prompt-suggestions" role="listbox" aria-label="Correspondências encontradas" aria-busy={searching}>
          {suggestions.length ? suggestions.map(item => <button type="button" role="option" aria-selected="false" key={item.key} onClick={() => applyPrompt(item.label)}><Search size={13} /><span>{item.label}</span><small>{item.kind}</small></button>) : <div className="wi-suggestions-skeleton" aria-hidden="true"><span /><span /><span /></div>}
        </div>}
      </div> : <footer className="wi-footer" role="status">{saved ? <><Check size={12} />Alterações guardadas</> : 'Rascunho local'}<span>Sem sincronização de equipa</span></footer>}
    </div>
  </aside>
}
