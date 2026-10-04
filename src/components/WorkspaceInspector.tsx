import { useEffect, useId, useState } from 'react'
import { NEWS_API } from '../api'
import { retryRead } from '../retryRead'
import { transitionView } from '../viewTransition'
import type { WorkspaceFeed } from '../workspaceFeedState'
import { ArrowUp, Check, Search } from './icons'
import './WorkspaceInspector.css'

type Suggestion = { key: string; label: string; kind: string }
export default function WorkspaceInspector({ feed, saved, change, tab, setTab }: {
  feed: WorkspaceFeed; saved: boolean; change: (patch: Partial<WorkspaceFeed>) => void
  tab: 'feed' | 'settings'; setTab: (tab: 'feed' | 'settings') => void
}) {
  const topicId = useId()
  const savedPrompt = feed.topics.join(' ou ')
  const [prompt, setPrompt] = useState(savedPrompt)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
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
          <label className="wi-label" htmlFor={topicId}>O QUE ACOMPANHAR</label>
          <div className="wi-prompt-wrap">
            <form className="wi-prompt-form" onSubmit={event => { event.preventDefault(); applyPrompt() }}>
              <textarea id={topicId} placeholder="Ex.: alterações na regulação energética europeia" value={prompt} maxLength={600} rows={4} onChange={event => setPrompt(event.target.value)} onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); applyPrompt() }
              }} />
              <button aria-label="Atualizar feed" disabled={prompt.trim() === savedPrompt}><ArrowUp size={15} /></button>
            </form>
            {(searching || suggestions.length > 0) && <div className="wi-prompt-suggestions" role="listbox" aria-label="Correspondências encontradas" aria-busy={searching}>
              {suggestions.length ? suggestions.map(item => <button type="button" role="option" aria-selected="false" key={item.key} onClick={() => applyPrompt(item.label)}><Search size={13} /><span>{item.label}</span><small>{item.kind}</small></button>) : <div className="wi-suggestions-skeleton" aria-hidden="true"><span /><span /><span /></div>}
            </div>}
          </div>
          <p className="wi-hint wi-prompt-note">Enter aplica a pesquisa. Shift + Enter cria uma nova linha. Sem descrição, são apresentadas todas as notícias.</p>
        </> : <>
          <h2>Página principal</h2>
          <label className="wi-field">Título<input value={feed.title} maxLength={120} onChange={event => change({ title: event.target.value })} /></label>
          <label className="wi-field">Descrição<textarea rows={4} value={feed.description} maxLength={600} onChange={event => change({ description: event.target.value })} placeholder="Contexto e objetivo da página" /></label>
        </>}
      </div>
      <footer className="wi-footer" role="status">{saved ? <><Check size={12} />Alterações guardadas</> : 'Rascunho local'}<span>Sem sincronização de equipa</span></footer>
    </div>
  </aside>
}
