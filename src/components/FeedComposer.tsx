import { Activity, useEffect, useRef, useState } from 'react'
import { Check, Plus, X } from './icons'
import { loadResearch, type ResearchMode, type ResearchRequest, type ResearchResult } from '../feedResearch'
import { retryRead } from '../retryRead'
import { transitionView } from '../viewTransition'
import FeedSearchBar from './FeedSearchBar'
import ResearchTopics from './ResearchTopics'
import ResearchTopStories from './ResearchTopStories'
import FeedArticleSearch from './FeedArticleSearch'
import './FeedComposer.css'
import './FeedResearch.css'

export default function FeedComposer({ theme, token }: { userId: string; theme: 'light' | 'dark'; token?: string }) {
  const [mode, setMode] = useState<ResearchMode>('search')
  const [input, setInput] = useState('')
  const [request, setRequest] = useState<(ResearchRequest & { revision: number }) | null>(null)
  const [results, setResults] = useState<Partial<Record<ResearchMode, ResearchResult>>>({})
  const [pending, setPending] = useState(false)
  const [articleQuery, setArticleQuery] = useState('')
  const controller = useRef<AbortController | null>(null)
  const run = (value = input) => {
    const query = value.trim()
    if (!query) return
    if (mode === 'search') { transitionView(() => { setInput(query); setArticleQuery(query) }); return }
    if (!token) return
    controller.current?.abort()
    transitionView(() => { setInput(query); setRequest({ query, mode, kind: 'all', days: 7, revision: Date.now() }); setPending(true) })
  }
  useEffect(() => {
    if (!request || !token) return
    const abort = new AbortController(); controller.current = abort
    void retryRead(() => loadResearch(request, token, abort.signal), abort.signal).then(result => {
      if (!abort.signal.aborted) transitionView(() => { if (abort.signal.aborted) return; setResults(current => ({ ...current, [result.mode]: result })); setPending(false) })
    }).catch(() => {})
    return () => abort.abort()
  }, [request, token])
  const switchMode = (next: ResearchMode) => {
    if (next === mode) return
    controller.current?.abort()
    transitionView(() => { setMode(next); setPending(false); setRequest(null) })
  }
  const reset = () => { controller.current?.abort(); transitionView(() => { setResults({}); setArticleQuery(''); setPending(false); setRequest(null); setInput('') }) }
  const result = results[mode]
  const active = mode === 'search' ? !!articleQuery : !!result || pending
  return <section className="feed-composer" data-mode={theme} aria-label="Novo feed">
    <div className={`fr-page${active ? ' fr-page-active' : ''}${mode === 'search' ? ' fr-page-search' : ''}`}>
      {active && <header className="fr-header"><button onClick={reset}><Plus size={16} />Nova pesquisa</button></header>}
      <div className="fr-content" role="tabpanel" id={`fs-${mode}-panel`} aria-labelledby={`fs-${mode}-tab`}>
        <Activity mode={mode === 'search' ? 'visible' : 'hidden'}><FeedArticleSearch query={articleQuery} /></Activity>
        {!active && token && mode === 'build' && <ResearchTopStories />}
        {request?.mode === mode && !result && <div className="fr-query-bubble">{request.query}</div>}
                {pending && result && request && request.query !== result.query && <div className="fr-query-bubble">{request.query}</div>}
        {pending && <div className="fr-skeleton" aria-busy="true" aria-label={mode === 'search' ? 'Pesquisa em curso' : 'Extração de critérios em curso'}><span /><span /><span /></div>}
        {result && <div className="fr-query-bubble">{result.query}</div>}
        {mode === 'build' && result && <div className="fr-entities" aria-label="Entidades identificadas">{result.entities.map(entity => <div key={entity.name}><span>{entity.matches.length === 1 ? <Check size={14} /> : null}{entity.matches[0]?.name ?? entity.name}</span><small>{entity.matches.length === 1 ? ({person:'Pessoa',org:'Organização',location:'Local'}[entity.matches[0].kind] ?? 'Entidade') : entity.matches.length ? 'Identidade por confirmar' : 'Palavra-chave'}</small></div>)}</div>}
      </div>
      <div className="fr-dock"><FeedSearchBar value={input} onChange={setInput} mode={mode} onMode={switchMode} onSubmit={run} />
        {!active && token && mode === 'build' && <ResearchTopics onSelect={run} />}
        {pending && <button className="fr-stop" onClick={() => { controller.current?.abort(); transitionView(() => { setPending(false); setRequest(null) }) }}><X size={14} />Cancelar</button>}
        {!token && mode === 'build' && <p className="fr-session">Sessão com email confirmado necessária para construir um feed.</p>}
      </div>
    </div>
  </section>
}
