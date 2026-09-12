import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { Settings, Sun, Moon, Monitor, ChevronRight, LogOut, Share2 } from 'lucide-react'
import { Button } from './components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from './components/ui/dropdown-menu'
import { authClient, type AuthSession } from './auth'
import type { Project } from './projects'
import { navigate } from './navigate'
import MakeApp from './MakeApp'
import { DashboardIcon } from './DashboardIcon'
import './Dashboard.css'

type Theme = 'light' | 'dark' | 'system'
const sections = [
  { path: '/settings', label: 'Conta' },
  { path: '/settings/project', label: 'Projeto' },
  { path: '/settings/appearance', label: 'Aparência' },
]

function follow(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  navigate(event.currentTarget.pathname + event.currentTarget.search)
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="dashboard-detail"><dt>{label}</dt><dd>{children}</dd></div>
}

export default function Dashboard({ path, session, project, basePath = '' }: { path: string; session: AuthSession | null; project: Project | null; basePath?: string }) {
  const settings = path === '/settings' || path.startsWith('/settings/')
  const section = sections.find(item => item.path === path) ?? sections[0]
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('fontes-dashboard-theme')
      return saved === 'light' || saved === 'dark' ? saved : 'system'
    } catch { return 'system' }
  })
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setSystemDark(media.matches)
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  const changeTheme = (value: string) => {
    if (value !== 'light' && value !== 'dark' && value !== 'system') return
    setTheme(value)
    try { localStorage.setItem('fontes-dashboard-theme', value) } catch { /* The current tab still applies the preference. */ }
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ url: location.href })
      else {
        await navigator.clipboard.writeText(location.href)
        setCopied(true)
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError('Não foi possível partilhar a ligação.')
    }
  }
  const signOut = async () => {
    setSigningOut(true)
    setError('')
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error('sign-out')
    } catch { setError('Não foi possível terminar a sessão.'); }
    finally { setSigningOut(false) }
  }
  return <div className="dashboard" data-theme={resolved}>
    <a className="dashboard-skip" href="#dashboard-content">Saltar para o conteúdo</a>
    <header className="dashboard-header">
      <div className="dashboard-team">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="dashboard-brand" aria-label="Abrir menu da conta">
            <img src="/mark.png" width={20} height={20} alt="Fontes" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="dashboard-menu" data-theme={resolved}>
          <DropdownMenuLabel>{project?.name ?? 'Fontes'}<span className="dashboard-menu-email">{session?.user.email ?? 'Área de trabalho'}</span></DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { void share() }}><Share2 />{copied ? 'Ligação copiada' : 'Partilhar ligação'}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate(`${basePath}/settings`)}><Settings />Definições da conta</DropdownMenuItem>
          {session && <DropdownMenuItem disabled={signingOut} onSelect={() => { void signOut() }}><LogOut />{signingOut ? 'A terminar sessão…' : 'Terminar sessão'}</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="dashboard-divider" aria-hidden="true" />
      </div>
      <nav className="dashboard-breadcrumb" aria-label="Localização">
        {settings ? <a href={`${basePath}/settings`} onClick={follow}>Settings</a> : <span aria-current="page">Home</span>}
        {settings && <><span className="dashboard-breadcrumb-separator" aria-hidden="true">/</span><span aria-current="page">{section.label}</span></>}
      </nav>
    </header>
    <aside className="dashboard-rail" aria-label="Navegação principal">
      <nav>
        <Button asChild variant="ghost" className="dashboard-nav" data-active={!settings}>
          <a href={`${basePath}/`} onClick={follow} aria-current={!settings ? 'page' : undefined}><span className="dashboard-nav-icon"><DashboardIcon name="home" selected={!settings} /></span><span>Home</span></a>
        </Button>
        <Button asChild variant="ghost" className="dashboard-nav" data-active={settings}>
          <a href={`${basePath}/settings`} onClick={follow} aria-current={settings ? 'page' : undefined}><span className="dashboard-nav-icon"><DashboardIcon name="settings" selected={settings} /></span><span>Settings</span></a>
        </Button>
      </nav>
      <Button variant="ghost" size="icon" className="dashboard-theme-toggle" aria-label={resolved === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={resolved === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} onClick={() => changeTheme(resolved === 'dark' ? 'light' : 'dark')}>
        <DashboardIcon name={resolved === 'dark' ? 'moon' : 'sun'} />
      </Button>
    </aside>
    <main id="dashboard-content" className="dashboard-panel" tabIndex={-1}>
      {error && <p className="dashboard-error" role="alert">{error}</p>}
      <div hidden={settings}><MakeApp session={session} /></div>
      {settings && <div className="dashboard-settings">
        <nav className="dashboard-settings-nav" aria-label="Definições">
          <p>Área de trabalho</p>
          {sections.map(item => <Button key={item.path} asChild variant="ghost" className="dashboard-settings-link" data-active={item.path === section.path}>
            <a href={`${basePath}${item.path}`} onClick={follow} aria-current={item.path === section.path ? 'page' : undefined}>{item.label}</a>
          </Button>)}
        </nav>
        <section className="dashboard-settings-content" aria-labelledby="settings-heading">
          <h1 id="settings-heading">{section.label}</h1>
          {section.path === '/settings' && <>
            <Card><CardHeader><CardTitle>Perfil</CardTitle><CardDescription>Informações da conta Fontes.</CardDescription></CardHeader><CardContent>
              <dl><Detail label="Nome">{session?.user.name || 'Não definido'}</Detail><Detail label="Email">{session?.user.email ?? 'Sem sessão ativa'}</Detail></dl>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Acesso</CardTitle><CardDescription>Palavra-passe e sessão atual.</CardDescription></CardHeader><CardContent className="dashboard-access">
              <Button asChild variant="outline"><a href="/account/password">Alterar palavra-passe<ChevronRight /></a></Button>
              {session && <Button variant="outline" disabled={signingOut} onClick={() => { void signOut() }}><LogOut />{signingOut ? 'A terminar sessão…' : 'Terminar sessão'}</Button>}
            </CardContent></Card>
          </>}
          {section.path === '/settings/project' && <Card><CardHeader><CardTitle>Área de trabalho</CardTitle><CardDescription>Projeto associado à conta.</CardDescription></CardHeader><CardContent>
            {project ? <dl><Detail label="Nome">{project.name}</Detail><Detail label="Criado em">{new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' }).format(new Date(project.createdAt))}</Detail></dl> : <p className="dashboard-muted">Sem projeto associado.</p>}
          </CardContent></Card>}
          {section.path === '/settings/appearance' && <Card><CardHeader><CardTitle>Tema</CardTitle><CardDescription>A aparência do dashboard fica guardada neste navegador.</CardDescription></CardHeader><CardContent>
            <Tabs value={theme} onValueChange={changeTheme}>
              <TabsList className="dashboard-theme-options" aria-label="Tema do dashboard">
                <TabsTrigger value="light"><Sun />Claro</TabsTrigger>
                <TabsTrigger value="dark"><Moon />Escuro</TabsTrigger>
                <TabsTrigger value="system"><Monitor />Sistema</TabsTrigger>
              </TabsList>
              <TabsContent value="light"><p className="dashboard-muted">Tema claro ativo.</p></TabsContent>
              <TabsContent value="dark"><p className="dashboard-muted">Tema escuro ativo.</p></TabsContent>
              <TabsContent value="system"><p className="dashboard-muted">O tema acompanha a aparência do sistema.</p></TabsContent>
            </Tabs>
          </CardContent></Card>}
        </section>
      </div>}
    </main>
  </div>
}
