import { cachedWorkspaces, invalidateWorkspaces, loadWorkspaces, workspaceCacheKey } from './workspaceCache'
import { onboardingRequest, type Bootstrap } from './onboardingSync'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './components/ui/dropdown-menu'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Copy, FileText, FolderOpen, Plus, Rss, Search, Settings2, Trash2, X } from 'lucide-react'
import type { AuthSession } from './auth'
import type { Project } from './projects'
import Feed from './Feed'
import './CompanyPages.css'

type Page = { id: string; title: string; description: string; group: string; topics: string[]; feedName?: string }
const initialPages: Page[] = [
  { id: 'overview', title: 'Visão geral', description: 'A atualidade que importa à organização, num só lugar.', group: 'Empresa', topics: [] },
  { id: 'sector', title: 'Radar do setor', description: 'Notícias, tendências e mudanças no setor.', group: 'Monitorização', topics: ['Tecnologia'] },
  { id: 'market', title: 'Mercados e economia', description: 'Os acontecimentos que ajudam a enquadrar decisões.', group: 'Monitorização', topics: ['Economia'] },
]
function readPages(key: string): Page[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || 'null')
    if (Array.isArray(value) && value.every(p => p && typeof p.id === 'string' && typeof p.title === 'string' && typeof p.description === 'string' && typeof p.group === 'string' && (p.feedName === undefined || typeof p.feedName === 'string') && Array.isArray(p.topics) && p.topics.every((t: unknown) => typeof t === 'string'))) return value
  } catch { /* Start with editable examples when storage is unavailable. */ }
  return initialPages
}
export default function CompanyPages({ session, project, organization, onWorkspaceChange, theme }: { session: AuthSession | null; project: Project | null; organization: Bootstrap['organization']; theme: 'light' | 'dark'; onWorkspaceChange?: (state: Bootstrap) => void }) {
  const storageKey = `fontes:company-pages:v1:${session?.user.id ?? 'preview'}:${project?.id ?? organization?.id ?? 'local'}`
  return <PagesEditor key={storageKey} storageKey={storageKey} session={session} company={organization?.name ?? 'Sem sessão ativa'} organization={organization} onWorkspaceChange={onWorkspaceChange} theme={theme} />
}
function PagesEditor({ storageKey, session, company, organization, onWorkspaceChange, theme }: { storageKey: string; session: AuthSession | null; company: string; organization: Bootstrap['organization']; theme: 'light' | 'dark'; onWorkspaceChange?: (state: Bootstrap) => void }) {
  const [pages, setPages] = useState(() => readPages(storageKey))
  const [activeId, setActiveId] = useState(() => pages[0]?.id)
  const [tab, setTab] = useState<'navigation' | 'feed' | 'settings'>('feed')
  const [inspector, setInspector] = useState(true)
  const [search, setSearch] = useState('')
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const cacheKey = session ? workspaceCacheKey(session.user.id, session.session.id) : null
  const [workspaces, setWorkspaces] = useState<NonNullable<Bootstrap['organization']>[]>(() => (cacheKey && cachedWorkspaces(cacheKey)) || (organization ? [organization] : []))
  const [workspaceStatus, setWorkspaceStatus] = useState<'idle' | 'loading' | 'error' | 'switching'>('idle')
  useEffect(() => {
    if (!workspaceOpen || !cacheKey) return
    let active = true
    const cached = cachedWorkspaces(cacheKey)
    if (cached) { setWorkspaces(cached); setWorkspaceStatus('idle'); return }
    setWorkspaceStatus('loading')
    loadWorkspaces(cacheKey)
      .then(result => { if (active) { setWorkspaces(result); setWorkspaceStatus('idle') } })
      .catch(() => { if (active) setWorkspaceStatus('error') })
    return () => { active = false }
  }, [workspaceOpen, cacheKey])
  const selectWorkspace = async (id: string) => {
    if (id === organization?.id) { setWorkspaceOpen(false); return }
    setWorkspaceStatus('switching')
    try {
      // Preserve current edits before leaving this workspace.
      localStorage.setItem(storageKey, JSON.stringify(pages))
      const next = await onboardingRequest<Bootstrap>('/workspaces/select', { organizationId: id })
      if (next.organization?.id !== id) throw new Error('workspace-selection')
      onWorkspaceChange?.(next)
      setWorkspaceOpen(false)
      setWorkspaceStatus('idle')
    } catch {
      if (cacheKey) invalidateWorkspaces(cacheKey)
      setWorkspaceStatus('error')
    }
  }
  const [topic, setTopic] = useState('')
  const nameDialog = useRef<HTMLDialogElement>(null)
  const [feedName, setFeedName] = useState('')
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)
  const [actionsTarget, setActionsTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setHeaderTarget(document.getElementById('company-feed-breadcrumb'))
    setActionsTarget(document.getElementById('company-page-actions'))
  }, [])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [removed, setRemoved] = useState<{ page: Page; index: number } | null>(null)
  const page = pages.find(p => p.id === activeId)
  const groupPages = pages.filter(p => p.group === page?.group)
  useEffect(() => { setTopic('') }, [activeId])
  const change = (patch: Partial<Page>) => {
    setPages(current => current.map(p => p.id === activeId ? { ...p, ...patch } : p))
    setSaved(false)
  }
  const saveNamedFeed = () => {
    if (!page || !feedName.trim()) return
    const next = pages.map(p => p.id === page.id ? { ...p, title: feedName.trim(), feedName: feedName.trim() } : p)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setPages(next); setSaved(true); setError(''); nameDialog.current?.close()
    } catch { setError('Não foi possível guardar o feed neste navegador.') }
  }
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(pages)); setSaved(true); setError('') }
    catch { setError('Não foi possível guardar as páginas neste navegador.') }
  }
  const add = () => {
    const next = { id: crypto.randomUUID(), title: 'Nova página', description: '', group: page?.group || 'Empresa', topics: [] }
    setPages(current => [...current, next]); setActiveId(next.id); setSaved(false); setInspector(true); setTab('settings')
  }
  const move = (direction: number) => {
    const sibling = groupPages[groupPages.findIndex(p => p.id === activeId) + direction]
    if (!sibling) return
    const index = pages.findIndex(p => p.id === activeId)
    const target = pages.findIndex(p => p.id === sibling.id)
    const next = [...pages]; [next[index], next[target]] = [next[target], next[index]]
    setPages(next); setSaved(false)
  }
  const addTopic = () => {
    const value = topic.trim()
    if (!page || !value) return
    if (!page.topics.some(t => t.toLowerCase() === value.toLowerCase())) change({ topics: [...page.topics, value] })
    setTopic('')
  }
  return <section className="cp" aria-label="Editor de páginas">
    {headerTarget && createPortal(<>
      <span className="cp-crumb-divider" aria-hidden="true">/</span>
      <DropdownMenu open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
        <DropdownMenuTrigger asChild><button className="cp-workspace-name" aria-label="Mudar ambiente de trabalho">{company}<ChevronDown size={13} aria-hidden="true" /></button></DropdownMenuTrigger>
        <DropdownMenuContent className="dashboard-menu cp-workspace-picker" data-theme={theme} align="start" sideOffset={4} collisionPadding={12}>
          {workspaceStatus === 'loading' && <p className="cp-workspace-empty" role="status">A carregar ambientes de trabalho…</p>}
          {workspaceStatus === 'error' && <p className="cp-workspace-empty" role="alert">Não foi possível carregar ou mudar o ambiente de trabalho. Fechar e voltar a abrir permite tentar novamente.</p>}
          <div className="cp-workspace-options">{workspaces.map(workspace => <DropdownMenuItem key={workspace.id} className="cp-workspace-option" aria-current={workspace.id === organization?.id ? 'true' : undefined} disabled={workspaceStatus === 'switching'} aria-label={`${workspace.name}${workspace.id === organization?.id ? ', ambiente de trabalho atual' : ''}`} onSelect={event => { event.preventDefault(); void selectWorkspace(workspace.id) }}>
            <span className="cp-workspace-option-copy">{workspace.name}</span>
            {workspace.id === organization?.id && <Check size={18} aria-hidden="true" />}
          </DropdownMenuItem>)}</div>
          {!workspaces.length && workspaceStatus === 'idle' && <p className="cp-workspace-empty" role="status">{session ? 'Nenhum ambiente de trabalho encontrado.' : 'Uma sessão ativa permite aceder aos ambientes de trabalho.'}</p>}
          {workspaceStatus === 'switching' && <p className="cp-workspace-empty" role="status">A mudar de ambiente de trabalho…</p>}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="cp-crumb-divider" aria-hidden="true">/</span>
      <button className="cp-feed-save-pill" disabled={!page} onClick={() => { setFeedName(page?.feedName || page?.title || ''); nameDialog.current?.showModal() }}>
        <Rss size={12} aria-hidden="true" /><span>{page?.feedName || 'Novo feed'}</span>
      </button>
    </>, headerTarget)}
    <dialog ref={nameDialog} className="cp-name-dialog" aria-labelledby="cp-name-title" onClick={e => { if (e.target === e.currentTarget) nameDialog.current?.close() }}>
      <form onSubmit={e => { e.preventDefault(); saveNamedFeed() }}>
        <h2 id="cp-name-title">Guardar feed</h2>
        <label className="cp-field">Nome do feed<input autoFocus required maxLength={120} value={feedName} onChange={e => setFeedName(e.target.value)} /></label>
        <p className="cp-hint">O feed fica guardado neste navegador.</p>
        {error && <p role="alert">{error}</p>}
        <div className="cp-name-actions"><button type="button" onClick={() => nameDialog.current?.close()}>Cancelar</button><button className="cp-save" disabled={!feedName.trim()}>Guardar feed</button></div>
      </form>
    </dialog>
    {actionsTarget && createPortal(<div className="cp-header-actions">

      <div>
        <button aria-label="Configuração" aria-pressed={inspector} onClick={() => setInspector(!inspector)}><Settings2 size={14} /><span>Configuração</span></button>
        <button className="cp-save" onClick={save}>{saved ? <Check size={13} /> : null}{saved ? 'Guardado' : 'Guardar'}</button>
      </div>
    </div>, actionsTarget)}
    {error && <p className="cp-notice" role="alert">{error}</p>}
    {removed && <div className="cp-notice" role="status">Página removida. <button onClick={() => { setPages(current => { const next = [...current]; next.splice(removed.index, 0, removed.page); return next }); setActiveId(removed.page.id); setRemoved(null); setSaved(false) }}>Anular</button><button aria-label="Fechar aviso" onClick={() => setRemoved(null)}><X size={13} /></button></div>}
    <div className="cp-workbench" data-inspector={inspector}>
      <div className="cp-document">
        <header className="cp-site-header"><span className="cp-company-mark">{company.slice(0, 1).toUpperCase()}</span><strong>{company}</strong><span className="cp-private">Páginas internas</span></header>
        <div className="cp-document-body">
          <aside className="cp-tree" aria-label="Navegação das páginas">
            <label className="cp-search"><Search size={14} /><input aria-label="Pesquisar páginas" placeholder="Pesquisar" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <button className="cp-tree-settings" onClick={() => { setInspector(true); setTab('navigation') }}><FolderOpen size={15} />Navegação<ChevronRight size={14} /></button>
            <button className="cp-tree-settings" onClick={() => { setInspector(true); setTab('settings') }}><Settings2 size={15} />Definições<ChevronRight size={14} /></button>
            <div className="cp-tree-divider" />
            {[...new Set(pages.map(p => p.group))].map(group => <div className="cp-group" key={group}>
              <div className="cp-group-title"><span>{group || 'Páginas'}</span>{<button aria-label={`Adicionar página a ${group}`} onClick={() => { const next = { id: crypto.randomUUID(), title: 'Nova página', description: '', group, topics: [] }; setPages([...pages, next]); setActiveId(next.id); setSaved(false); setTab('settings'); setInspector(true) }}><Plus size={14} /></button>}</div>
              {pages.filter(p => p.group === group && p.title.toLowerCase().includes(search.toLowerCase())).map(p => <button className="cp-page-link" key={p.id} aria-current={p.id === activeId ? 'page' : undefined} onClick={() => setActiveId(p.id)}><FileText size={14} /><span>{p.title || 'Sem título'}</span>{p.topics.length > 0 && <Rss size={12} />}</button>)}
            </div>)}
            {!pages.some(p => p.title.toLowerCase().includes(search.toLowerCase())) && <p className="cp-hint">Sem páginas.</p>}
            {<button className="cp-add-page" onClick={add}><Plus size={14} />Adicionar página</button>}
            <p className="cp-local">Guardado neste navegador</p>
          </aside>
          <article className="cp-canvas">
            {page ? <>
              <div className="cp-page-heading"><div className="cp-eyebrow"><FileText size={13} />{page.group || 'Páginas'}</div><h1>{page.title || 'Sem título'}</h1>{page.description && <p>{page.description}</p>}</div>
              <div className="cp-feed-heading"><span><Rss size={14} />{page.topics.length ? 'Feed personalizado' : 'Últimas notícias'}</span><span className="cp-live"><i />Em atualização</span></div>
              {page.topics.length > 0 && <div className="cp-feed-topics">{page.topics.map(t => <span key={t}>{t}</span>)}</div>}
              <div className="make-shell cp-feed"><Feed key={page.id} session={session} queries={page.topics} /></div>
            </> : <div className="cp-empty"><FileText size={32} /><h1>Páginas da empresa</h1><p>Um espaço para organizar notícias, temas e perspetivas.</p><button onClick={add}><Plus size={14} />Criar página</button></div>}
          </article>
        </div>
      </div>
      {inspector && <aside className="cp-inspector" aria-label="Configuração da página">
        <nav className="cp-tabs" aria-label="Secções de configuração">{(['navigation', 'feed', 'settings'] as const).map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{({ navigation: 'Navegação', feed: 'Feed', settings: 'Definições' })[t]}</button>)}</nav>
        <div className="cp-inspector-body">
          {page ? <>
            {tab === 'feed' && <><h2>Feed de notícias</h2><p className="cp-hint">Notícias que correspondem a qualquer um dos temas definidos.</p><label className="cp-label" htmlFor="cp-topic">TEMAS E PALAVRAS-CHAVE</label><form className="cp-topic-form" onSubmit={e => { e.preventDefault(); addTopic() }}><input id="cp-topic" placeholder="Ex.: energia, concorrência" value={topic} maxLength={100} onChange={e => setTopic(e.target.value)} /><button aria-label="Adicionar tema" disabled={!topic.trim()}><Plus size={15} /></button></form><div className="cp-topic-list">{page.topics.map(t => <span key={t}>{t}<button aria-label={`Remover tema ${t}`} onClick={() => change({ topics: page.topics.filter(v => v !== t) })}><X size={12} /></button></span>)}</div><p className="cp-hint">Sem temas, a página apresenta todas as notícias.</p><div className="cp-rule" /><h2>Sugestões</h2><div className="cp-suggestions">{['Tecnologia', 'Energia', 'Economia', 'Saúde', 'Sustentabilidade'].filter(t => !page.topics.includes(t)).map(t => <button key={t} onClick={() => change({ topics: [...page.topics, t] })}><Plus size={12} />{t}</button>)}</div></>}
            {tab === 'settings' && <><h2>Página</h2><label className="cp-field">Título<input value={page.title} maxLength={120} onChange={e => change({ title: e.target.value })} /></label><label className="cp-field">Descrição<textarea rows={4} value={page.description} maxLength={600} onChange={e => change({ description: e.target.value })} placeholder="Contexto e objetivo da página" /></label><label className="cp-field">Grupo<input value={page.group} maxLength={80} onChange={e => change({ group: e.target.value })} /></label><div className="cp-rule" /><button className="cp-action" onClick={() => { const next = { ...page, feedName: undefined, id: crypto.randomUUID(), title: `${page.title} (cópia)` }; setPages([...pages, next]); setActiveId(next.id); setSaved(false) }}><Copy size={14} />Duplicar página</button><button className="cp-action cp-danger" onClick={() => { const index = pages.findIndex(p => p.id === page.id); setRemoved({ page, index }); const next = pages.filter(p => p.id !== page.id); setPages(next); setActiveId(next[Math.min(index, next.length - 1)]?.id); setSaved(false) }}><Trash2 size={14} />Remover página</button></>}
            {tab === 'navigation' && <><h2>Navegação</h2><p className="cp-hint">A ordem e os grupos definem a navegação das páginas.</p><label className="cp-field">Grupo da página<input value={page.group} maxLength={80} onChange={e => change({ group: e.target.value })} /></label><div className="cp-rule" /><h2>Ordem da página</h2><button className="cp-action" disabled={groupPages[0]?.id === activeId} onClick={() => move(-1)}><ArrowUp size={14} />Mover para cima</button><button className="cp-action" disabled={groupPages.at(-1)?.id === activeId} onClick={() => move(1)}><ArrowDown size={14} />Mover para baixo</button><div className="cp-rule" /><button className="cp-action" onClick={add}><Plus size={14} />Adicionar página</button></>}
          </> : <p className="cp-hint">A configuração fica disponível após a criação de uma página.</p>}
        </div>
        <footer className="cp-inspector-footer" role="status">{saved ? <><Check size={12} />Alterações guardadas</> : 'Rascunho local'}<span>Sem sincronização de equipa</span></footer>
      </aside>}
    </div>
  </section>
}
