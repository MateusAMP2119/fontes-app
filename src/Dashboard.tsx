import type { Bootstrap } from './onboardingSync'
import { Activity, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Settings, Sun, Moon, Monitor, FolderPlus, Plus, ChevronRight, LogOut, Share2, PanelLeftOpen, PanelLeftClose, IconSliders, Sync, SyncOff, Check } from './components/icons'
import { Button } from './components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from './components/ui/dropdown-menu'
import { authClient, type AuthSession } from './auth'
import type { Project } from './projects'
import { navigate } from './navigate'
import { transitionView } from './viewTransition'
import MakeApp from './MakeApp'
import WorkspaceInspector from './components/WorkspaceInspector'
import CreateWorkspaceDialog from './components/CreateWorkspaceDialog'
import FeedComposer from './components/FeedComposer'
import EditableName from './components/EditableName'
import PageIcon from './components/PageIcon'
import WorkspaceLink from './components/WorkspaceLink'
import { Toast } from './OnboardingFeedback'
import { legacyWorkspaceId, migrateWorkspaceFavorites, readWorkspaceFeed, saveWorkspaceFeed, toggleFavorite, useFavorites, type WorkspaceFeed, type WorkspaceEntry } from './workspaceFeedState'
import { useWorkspaceDirectory } from './useWorkspaceDirectory'
import Article from './Article'
import { DashboardIcon } from './DashboardIcon'
import './Dashboard.css'

type Theme = 'light' | 'dark' | 'system'
const sections = [
  { path: '/settings', label: 'Conta' },
  { path: '/settings/project', label: 'Projeto' },
  { path: '/settings/appearance', label: 'Aparência' },
]
function readIds(key: string): string[] {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter(id => typeof id === 'string') : [] }
  catch { return [] }
}
function follow(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  navigate(event.currentTarget.pathname + event.currentTarget.search)
}
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="dashboard-detail"><dt>{label}</dt><dd>{children}</dd></div>
}

export default function Dashboard({ path, session, project, organization = null, onWorkspaceChange, basePath = '' }: {
  path: string; session: AuthSession | null; project: Project | null; organization?: Bootstrap['organization']
  onWorkspaceChange?: (state: Bootstrap) => void; basePath?: string
}) {
  const dashboardRoot = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let preventSelection = false
    const editable = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
      return !!element?.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')
    }
    const pointerDown = (event: PointerEvent) => {
      const bounds = dashboardRoot.current?.getBoundingClientRect()
      preventSelection = !editable(event.target) && !!bounds && event.clientX >= bounds.left && event.clientX < bounds.right && event.clientY >= bounds.top && event.clientY < bounds.bottom
      if (preventSelection) window.getSelection()?.removeAllRanges()
    }
    const selectStart = (event: Event) => { if (preventSelection && !editable(event.target)) event.preventDefault() }
    document.addEventListener('pointerdown', pointerDown, true)
    document.addEventListener('selectstart', selectStart, true)
    return () => { document.removeEventListener('pointerdown', pointerDown, true); document.removeEventListener('selectstart', selectStart, true) }
  }, [])
  const settings = path === '/settings' || path.startsWith('/settings/')
  const article = path.match(/^\/(eventos|historias)\/(.+)$/)
  const { entries, ready, addWorkspace } = useWorkspaceDirectory(session, project, organization)
  const userId = session?.user.id ?? 'preview'
  const orderKey = `fontes:workspace-order:${userId}`
  const hiddenKey = `fontes:hidden-sidebar-groups:${userId}`
  const favoriteOrderKey = `fontes:favorite-order:${userId}`
  const [order, setOrder] = useState(() => readIds(orderKey))
  const [favoriteOrder, setFavoriteOrder] = useState(() => readIds(favoriteOrderKey))
  const [hidden, setHidden] = useState(() => readIds(hiddenKey))
  const [drafts, setDrafts] = useState<Record<string, WorkspaceFeed>>({})
  const [error, setError] = useState('')
  const [reorderAnnouncement, setReorderAnnouncement] = useState('')
  const [removed, setRemoved] = useState<string | null>(null)
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const creatingFeed = path === '/new-feed'
  const workspacePath = (id: string) => `${basePath}/groups/${encodeURIComponent(id)}`
  const workspaces = useMemo(() => entries.filter(workspace => !hidden.includes(workspace.id)).map(workspace => {
    const feed = drafts[workspace.storageKey] ?? readWorkspaceFeed(workspace)
    return { ...workspace, name: feed.title.trim() || 'Sem título', feed, href: `${basePath}/groups/${encodeURIComponent(workspace.id)}` }
  }).sort((a, b) => {
    const rank = (id: string) => { const index = order.indexOf(id); return index < 0 ? order.length : index }
    return rank(a.id) - rank(b.id)
  }), [entries, hidden, drafts, basePath, order])
  const current = workspaces.find(workspace => `${basePath}${path}` === workspace.href)
  const defaultWorkspace = workspaces.find(workspace => workspace.id === organization?.id) ?? workspaces[0]
  const lastWorkspace = useRef<string | null>(null)
  if (current) lastWorkspace.current = current.id
  const returnWorkspace = workspaces.find(workspace => workspace.id === lastWorkspace.current) ?? defaultWorkspace
  const favorites = useFavorites()
  // Start from directory order, never from the independently reordered workspace list.
  const favoriteRows = entries.flatMap(entry => {
    const workspace = workspaces.find(item => item.id === entry.id)
    return workspace && favorites.includes(workspace.href) ? [workspace] : []
  }).sort((a, b) => {
    const rank = (id: string) => { const index = favoriteOrder.indexOf(id); return index < 0 ? favoriteOrder.length : index }
    return rank(a.id) - rank(b.id)
  })
  const favoriteIdsSnapshot = JSON.stringify(favoriteRows.map(workspace => workspace.id))
  useEffect(() => {
    const ids: string[] = JSON.parse(favoriteIdsSnapshot)
    const added = ids.filter(id => !favoriteOrder.includes(id))
    if (!added.length) return
    const next = [...favoriteOrder, ...added]
    try { localStorage.setItem(favoriteOrderKey, JSON.stringify(next)) } catch { /* Session order still works. */ }
    setFavoriteOrder(next)
  }, [favoriteIdsSnapshot, favoriteOrder, favoriteOrderKey])
  const removeFavorite = (href: string) => transitionView(() => {
    try { toggleFavorite(href) } catch { setError('Não foi possível guardar o favorito.') }
  })
  useEffect(() => {
    for (const workspace of entries) migrateWorkspaceFavorites(workspace, basePath, workspace.id === (organization?.id ?? project?.id ?? 'local'))
  }, [entries, basePath, organization?.id, project?.id])

  const [inspector, setInspector] = useState<{ id: string; tab: 'feed' | 'settings' } | null>(null)
  const inspectorOpen = !!current && inspector?.id === current.id
  useEffect(() => {
    if (!inspectorOpen) return
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) transitionView(() => setInspector(null))
    }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [inspectorOpen])
  const changeFeed = (workspace: WorkspaceEntry, patch: Partial<WorkspaceFeed>) => {
    setDrafts(previous => ({ ...previous, [workspace.storageKey]: { ...(previous[workspace.storageKey] ?? readWorkspaceFeed(workspace)), ...patch } }))
  }
  const renameWorkspace = (workspace: WorkspaceEntry, title: string) => {
    const feed = { ...(drafts[workspace.storageKey] ?? readWorkspaceFeed(workspace)), title }
    saveWorkspaceFeed(workspace, feed)
    setDrafts(previous => ({ ...previous, [workspace.storageKey]: feed }))
  }
  let saved = false
  try { saved = !!current && localStorage.getItem(current.storageKey) === JSON.stringify(current.feed) } catch { /* Storage can be unavailable. */ }
  const saveFeed = () => {
    if (!current) return
    try {
      saveWorkspaceFeed(current, current.feed)
      transitionView(() => { setDrafts(previous => ({ ...previous, [current.storageKey]: current.feed })); setError('') })
    } catch { transitionView(() => setError('Não foi possível guardar o feed neste navegador.')) }
  }
  // The former editor and child URLs are compatibility redirects only.
  const currentId = current?.id
  const isArticle = !!article
  const legacyId = legacyWorkspaceId(path, organization?.id ?? project?.id ?? 'local')
  const redirect = workspaces.find(workspace => workspace.id === legacyId) ?? defaultWorkspace
  useEffect(() => {
    if (creatingFeed || settings || isArticle || currentId || !ready || !redirect) return
    const timer = window.setTimeout(() => transitionView(() => {
      if (path === '/pages' || path.startsWith('/pages/')) setInspector({ id: redirect.id, tab: 'feed' })
      history.replaceState(null, '', redirect.href + location.search + location.hash)
      dispatchEvent(new PopStateEvent('popstate'))
    }), 0)
    return () => window.clearTimeout(timer)
  }, [path, creatingFeed, settings, isArticle, currentId, ready, redirect])

  const moveSidebarRow = (section: 'favorites' | 'workspaces', id: string, targetId: string, after: boolean) => {
    const isFavorite = section === 'favorites'
    const ids = (isFavorite ? favoriteRows : workspaces).map(workspace => workspace.id)
    if (id === targetId || !ids.includes(id) || !ids.includes(targetId)) return
    const next = ids.filter(value => value !== id)
    next.splice(next.indexOf(targetId) + (after ? 1 : 0), 0, id)
    if (next.every((value, index) => value === ids[index])) return
    try { localStorage.setItem(isFavorite ? favoriteOrderKey : orderKey, JSON.stringify(next)) } catch { /* Keep the order for this session. */ }
    transitionView(() => {
      if (isFavorite) setFavoriteOrder(next)
      else setOrder(next)
      setReorderAnnouncement(`${isFavorite ? 'Favorito' : 'Ambiente'} na posição ${next.indexOf(id) + 1} de ${next.length}.`)
    })
  }
  const hideWorkspace = (id: string) => {
    const next = [...new Set([...hidden, id])]
    try { localStorage.setItem(hiddenKey, JSON.stringify(next)) }
    catch { transitionView(() => setError('Não foi possível remover o ambiente da barra lateral.')); return }
    transitionView(() => { setHidden(next); setRemoved(id); setError('') })
  }
  const restoreWorkspaces = (ids: string[]) => {
    const next = hidden.filter(id => !ids.includes(id))
    try { localStorage.setItem(hiddenKey, JSON.stringify(next)) }
    catch { transitionView(() => setError('Não foi possível restaurar o ambiente.')); return }
    transitionView(() => { setHidden(next); setRemoved(null); setError('') })
  }
  const [openedWorkspaces, setOpenedWorkspaces] = useState<string[]>([])
  useEffect(() => {
    if (currentId) setOpenedWorkspaces(previous => previous.includes(currentId) ? previous : [...previous, currentId])
  }, [currentId])
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const sidebar = useRef<HTMLElement>(null)
  const [controlsRow, setControlsRow] = useState<string | null>(null)
  const requestedControlsRow = useRef<string | null>(null)
  const showRowControls = (key: string | null) => {
    if (requestedControlsRow.current === key) return
    requestedControlsRow.current = key
    transitionView(() => setControlsRow(requestedControlsRow.current))
  }
  const sidebarRowKey = (target: EventTarget | null) => target instanceof Element
    ? target.closest<HTMLElement>('[data-sidebar-row]')?.dataset.sidebarRow ?? null : null
  const favoritesSnapshot = favorites.join('\n')
  useLayoutEffect(() => {
    const nav = sidebar.current
    if (!nav) return
    const updateFade = () => { nav.dataset.fadeTop = String(nav.scrollTop > 1); nav.dataset.fadeBottom = String(nav.scrollHeight - nav.clientHeight - nav.scrollTop > 1) }
    const observer = new ResizeObserver(updateFade)
    observer.observe(nav)
    for (const child of nav.children) observer.observe(child)
    nav.addEventListener('scroll', updateFade, { passive: true })
    updateFade()
    return () => { observer.disconnect(); nav.removeEventListener('scroll', updateFade) }
  }, [entries, hidden, favoritesSnapshot, sidebarExpanded])
  const section = sections.find(item => item.path === path) ?? sections[0]
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return
      if (event.code === 'KeyS') { event.preventDefault(); navigate(`${basePath}/settings`) }
      if (event.code === 'KeyP' && (current ?? defaultWorkspace)) {
        event.preventDefault()
        const workspace = current ?? defaultWorkspace!
        transitionView(() => { setInspector({ id: workspace.id, tab: 'feed' }); navigate(workspace.href) })
      }
    }
    addEventListener('keydown', onKeyDown, true)
    return () => removeEventListener('keydown', onKeyDown, true)
  }, [basePath, current, defaultWorkspace])
  const [theme, setTheme] = useState<Theme>(() => {
    try { const value = localStorage.getItem('fontes-dashboard-theme'); return value === 'light' || value === 'dark' ? value : 'system' }
    catch { return 'system' }
  })
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const [signingOut, setSigningOut] = useState(false)
  const [copied, setCopied] = useState(false)
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const sync = () => transitionView(() => setSystemDark(media.matches))
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  const changeTheme = (value: string) => {
    if (value !== 'light' && value !== 'dark' && value !== 'system') return
    transitionView(() => setTheme(value))
    try { localStorage.setItem('fontes-dashboard-theme', value) } catch { /* The current tab still applies the preference. */ }
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ url: location.href })
      else { await navigator.clipboard.writeText(location.href); transitionView(() => setCopied(true)) }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) transitionView(() => setError('Não foi possível partilhar a ligação.'))
    }
  }
  const signOut = async () => {
    transitionView(() => { setSigningOut(true); setError('') })
    try { const result = await authClient.signOut(); if (result.error) throw new Error('sign-out') }
    catch { transitionView(() => setError('Não foi possível terminar a sessão.')) }
    finally { transitionView(() => setSigningOut(false)) }
  }

  return <div ref={dashboardRoot} className="dashboard" data-theme={resolved} data-sidebar-expanded={sidebarExpanded}
    onMouseDownCapture={event => {
      const target = event.target as HTMLElement
      if (event.detail > 1 && !target.closest('input, textarea, [contenteditable="true"]') && target.closest('.dashboard-rail, .dashboard-header, .dashboard-menu, button')) event.preventDefault()
    }}>
    <a className="dashboard-skip" href="#dashboard-content">Saltar para o conteúdo</a>
    <header className="dashboard-header">
      <div className="dashboard-team">
        <Button variant="ghost" size="icon" className="dashboard-sidebar-toggle" aria-label={sidebarExpanded ? 'Recolher barra lateral' : 'Expandir barra lateral'} aria-expanded={sidebarExpanded} aria-controls="dashboard-sidebar" onClick={() => transitionView(() => { setSidebarExpanded(expanded => !expanded); showRowControls(null) })}>
          {sidebarExpanded ? <PanelLeftClose size={16} aria-hidden="true" /> : <PanelLeftOpen size={16} aria-hidden="true" />}
        </Button>
        <div className="dashboard-divider" aria-hidden="true" />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="dashboard-brand" aria-label="Abrir menu da conta"><img src="/mark.png" width={20} height={20} alt="Fontes" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="dashboard-menu" data-theme={resolved}>
          <DropdownMenuLabel>{project?.name ?? 'Fontes'}<span className="dashboard-menu-email">{session?.user.email ?? 'Área de trabalho'}</span></DropdownMenuLabel>
          <DropdownMenuSeparator />
          {session && <DropdownMenuItem onSelect={() => transitionView(() => setCreatingWorkspace(true))}><FolderPlus />Criar ambiente de trabalho</DropdownMenuItem>}
          <DropdownMenuItem onSelect={() => { void share() }}><Share2 />{copied ? 'Ligação copiada' : 'Partilhar ligação'}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate(`${basePath}/settings`)}><Settings />Definições da conta</DropdownMenuItem>
          {session && <DropdownMenuItem disabled={signingOut} onSelect={() => { void signOut() }}><LogOut />{signingOut ? 'A terminar sessão…' : 'Terminar sessão'}</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      <nav className="dashboard-breadcrumb" aria-label="Localização">
        {creatingFeed ? <span aria-current="page">Novo feed</span> : settings ? <><a href={`${basePath}/settings`} onClick={follow}>Definições</a><span className="dashboard-breadcrumb-separator" aria-hidden="true">/</span><span aria-current="page">{section.label}</span></> : article ? <>
          <a href={returnWorkspace?.href ?? `${basePath}/`} onClick={follow}>{returnWorkspace && <PageIcon storageKey={returnWorkspace.storageKey} id="main" />}{returnWorkspace?.name || 'Área de trabalho'}</a>
          <span className="dashboard-breadcrumb-separator" aria-hidden="true">/</span><span id="article-breadcrumb" aria-current="page" />
        </> : current ? <span aria-current="page"><PageIcon editable storageKey={current.storageKey} id="main" title={current.name} /><EditableName key={current.id} name={current.name} onSave={name => renameWorkspace(current, name)} /></span> : <span>Área de trabalho</span>}
      </nav>
      {current && <div className="dashboard-feed-actions">
        <Button variant="ghost" size="icon" aria-label={saved ? 'Guardado' : 'Não guardado'} data-sync-state={saved ? 'synced' : 'unsynced'} onClick={saveFeed}>
          <span className="dashboard-save-icon" aria-hidden="true">{saved ? <Sync className="size-4" /> : <SyncOff className="size-4" />}{saved && <Check className="dashboard-save-badge size-2.5" />}</span>
        </Button>
        <span className="sr-only" role="status">{saved ? 'Guardado' : 'Não guardado'}</span>
        <Button variant="ghost" size="icon" aria-label="Configuração do feed" aria-keyshortcuts="Meta+P Control+P" aria-expanded={inspectorOpen} aria-controls="feed-inspector" onClick={() => transitionView(() => setInspector(inspectorOpen ? null : { id: current.id, tab: 'feed' }))}><IconSliders size={18} aria-hidden="true" /></Button>
      </div>}
    </header>
    <aside id="dashboard-sidebar" className="dashboard-rail" aria-label="Navegação principal" hidden={!sidebarExpanded}
      onPointerDownCapture={event => { event.currentTarget.dataset.keyboardFocus = 'false' }} onKeyDownCapture={event => { if (['Tab', 'ArrowUp', 'ArrowDown', 'F2'].includes(event.key)) event.currentTarget.dataset.keyboardFocus = 'true' }}>
      <span id="workspace-reorder-help" className="sr-only">Arrastar para reordenar. Teclas para cima e para baixo para mover.</span>
      <span className="sr-only" role="status">{reorderAnnouncement}</span>
      <nav ref={sidebar}
        onPointerMove={event => { if (!event.buttons) showRowControls(sidebarRowKey(event.target)) }}
        onPointerDown={event => { if (event.pointerType === 'touch') showRowControls(sidebarRowKey(event.target)) }}
        onPointerLeave={event => {
          // A root snapshot may emit leave without the pointer actually leaving.
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.clientX >= bounds.left && event.clientX < bounds.right && event.clientY >= bounds.top && event.clientY < bounds.bottom) return
          showRowControls(null)
        }}
        onFocusCapture={event => showRowControls(sidebarRowKey(event.target))}
        onKeyDownCapture={event => showRowControls(sidebarRowKey(event.target))}
        onBlurCapture={event => {
          // Hiding an old row's focused button must not dismiss a new hover row.
          if (!event.currentTarget.contains(event.relatedTarget) && sidebarRowKey(event.target) === requestedControlsRow.current) showRowControls(null)
        }}>
        <section className="sidebar-section" aria-labelledby="sidebar-favorites-heading">
          <h2 id="sidebar-favorites-heading" className="sidebar-section-label">Favoritos</h2>
          <div className="sidebar-row-list" data-order-scope="favorites">
            {favoriteRows.map(workspace => <WorkspaceLink key={workspace.id} workspace={workspace} href={workspace.href} selected={current?.id === workspace.id} section="favorites" controlsVisible={controlsRow === `favorites:${workspace.id}`} ids={favoriteRows.map(item => item.id)} follow={follow} onMove={(id, target, after) => moveSidebarRow('favorites', id, target, after)} onRename={name => renameWorkspace(workspace, name)} onRemove={() => removeFavorite(workspace.href)} />)}
          </div>
        </section>
        <section className="sidebar-section" aria-labelledby="sidebar-workspaces-heading">
          <h2 id="sidebar-workspaces-heading" className="sidebar-section-label">Área de trabalho</h2>
          <div className="sidebar-row-list" data-order-scope="workspaces">
            {workspaces.map(workspace => <WorkspaceLink key={workspace.id} workspace={workspace} href={workspace.href} selected={current?.id === workspace.id} section="workspaces" controlsVisible={controlsRow === `workspaces:${workspace.id}`} ids={workspaces.map(item => item.id)} follow={follow} onMove={(id, target, after) => moveSidebarRow('workspaces', id, target, after)} onRename={name => renameWorkspace(workspace, name)} onRemove={() => hideWorkspace(workspace.id)} />)}
          </div>
          <Button variant="ghost" className="dashboard-nav" aria-label="Novo feed" onClick={() => navigate(`${basePath}/new-feed`)} disabled={!session}><span className="dashboard-nav-icon"><Plus size={16} aria-hidden="true" /></span><span className="dashboard-nav-label">Novo feed</span></Button>
        </section>
      </nav>
      <Button asChild variant="ghost" className="dashboard-nav dashboard-settings-entry" data-active={settings}>
        <a href={`${basePath}/settings`} onClick={follow} aria-label="Settings" aria-keyshortcuts="Meta+S Control+S" aria-current={settings ? 'page' : undefined}><span className="dashboard-nav-icon"><DashboardIcon name="settings" /></span><span className="dashboard-nav-label">Definições</span></a>
      </Button>
      <div className="dashboard-rail-divider" aria-hidden="true" />
      <Button variant="ghost" size="icon" className="dashboard-theme-toggle" role="switch" aria-checked={resolved === 'dark'} aria-label="Tema escuro" onClick={() => changeTheme(resolved === 'dark' ? 'light' : 'dark')}><DashboardIcon name={resolved === 'dark' ? 'moon' : 'sun'} /><span className="dashboard-theme-track" aria-hidden="true"><span className="dashboard-theme-thumb" /></span></Button>
    </aside>
    {creatingWorkspace && session && <CreateWorkspaceDialog onClose={() => setCreatingWorkspace(false)} onCreated={state => { addWorkspace(state); onWorkspaceChange?.(state); navigate(workspacePath(state.organization!.id)) }} />}
    {removed && <div className="ob-toasts sidebar-toasts"><Toast message="Ambiente removido da barra lateral." onDismiss={() => transitionView(() => setRemoved(null))} action={{ label: 'Desfazer', onClick: () => restoreWorkspaces([removed]) }} /></div>}
    <main id="dashboard-content" className="dashboard-panel" data-feed-inspector={inspectorOpen} tabIndex={-1}>
      {creatingFeed && <FeedComposer key={userId} userId={userId} theme={resolved} token={session?.user.emailVerified ? session.session.token : undefined} />}
      {error && <p className="dashboard-error" role="alert">{error}</p>}
      {workspaces.filter(workspace => openedWorkspaces.includes(workspace.id) || current?.id === workspace.id).map(workspace => <Activity key={workspace.id} mode={current?.id === workspace.id ? 'visible' : 'hidden'}><div hidden={current?.id !== workspace.id} className="dashboard-feed-view" aria-label={`Feed de ${workspace.name}`}><MakeApp session={session} queries={workspace.feed.topics} /></div></Activity>)}
      {current && inspectorOpen && <div id="feed-inspector" className="feed-inspector-content"><WorkspaceInspector key={current.id} feed={current.feed} saved={saved} tab={inspector!.tab} setTab={tab => setInspector({ id: current.id, tab })} change={patch => changeFeed(current, patch)} /></div>}
      {article && <Article kind={article[1] === 'eventos' ? 'events' : 'stories'} itemKey={decodeURIComponent(article[2])} key={path} />}
      {!creatingFeed && !settings && !article && ready && !workspaces.length && <section className="dashboard-workspace-empty"><p>Sem ambientes visíveis.</p><Button variant="ghost" onClick={() => restoreWorkspaces(hidden)}>Mostrar ambientes</Button></section>}
      {settings && <div className="dashboard-settings">
        <nav className="dashboard-settings-nav" aria-label="Definições"><p>Área de trabalho</p>{sections.map(item => <Button key={item.path} asChild variant="ghost" className="dashboard-settings-link" data-active={item.path === section.path}><a href={`${basePath}${item.path}`} onClick={follow} aria-current={item.path === section.path ? 'page' : undefined}>{item.label}</a></Button>)}</nav>
        <section className="dashboard-settings-content" aria-labelledby="settings-heading">
          <h1 id="settings-heading">{section.label}</h1>
          {section.path === '/settings' && <>
            <Card><CardHeader><CardTitle>Perfil</CardTitle><CardDescription>Informações da conta Fontes.</CardDescription></CardHeader><CardContent><dl><Detail label="Nome">{session?.user.name || 'Não definido'}</Detail><Detail label="Email">{session?.user.email ?? 'Sem sessão ativa'}</Detail></dl></CardContent></Card>
            <Card><CardHeader><CardTitle>Acesso</CardTitle><CardDescription>Palavra-passe e sessão atual.</CardDescription></CardHeader><CardContent className="dashboard-access"><Button asChild variant="outline"><a href="/account/password">Alterar palavra-passe<ChevronRight /></a></Button>{session && <Button variant="outline" disabled={signingOut} onClick={() => { void signOut() }}><LogOut />{signingOut ? 'A terminar sessão…' : 'Terminar sessão'}</Button>}</CardContent></Card>
          </>}
          {section.path === '/settings/project' && <Card><CardHeader><CardTitle>Área de trabalho</CardTitle><CardDescription>Projeto associado à conta.</CardDescription></CardHeader><CardContent>{project ? <dl><Detail label="Nome">{project.name}</Detail><Detail label="Criado em">{new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' }).format(new Date(project.createdAt))}</Detail></dl> : <p className="dashboard-muted">Sem projeto associado.</p>}</CardContent></Card>}
          {section.path === '/settings/appearance' && <Card><CardHeader><CardTitle>Tema</CardTitle><CardDescription>A aparência do dashboard fica guardada neste navegador.</CardDescription></CardHeader><CardContent><Tabs value={theme} onValueChange={changeTheme}><TabsList className="dashboard-theme-options" aria-label="Tema do dashboard"><TabsTrigger value="light"><Sun />Claro</TabsTrigger><TabsTrigger value="dark"><Moon />Escuro</TabsTrigger><TabsTrigger value="system"><Monitor />Sistema</TabsTrigger></TabsList><TabsContent value="light"><p className="dashboard-muted">Tema claro ativo.</p></TabsContent><TabsContent value="dark"><p className="dashboard-muted">Tema escuro ativo.</p></TabsContent><TabsContent value="system"><p className="dashboard-muted">O tema acompanha a aparência do sistema.</p></TabsContent></Tabs></CardContent></Card>}
        </section>
      </div>}
    </main>
  </div>
}
