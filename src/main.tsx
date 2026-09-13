import OnboardingLayout from './OnboardingLayout'
import { restoreDestination } from './authDestination'
import PasswordRecovery from './Password'
import PwaConnection from './PwaConnection'
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import Dashboard from './Dashboard'
import './shadcn.css'
import Article from './Article.tsx'
import Onboarding from './Onboarding.tsx'
import { authClient, AUTH_ENABLED, type AuthSession } from './auth'
import { type Project } from './projects'
import { onboardingRequest, type Bootstrap } from './onboardingSync'

function usePath() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const sync = () => {
      const swap = () => flushSync(() => setPath(location.pathname))
      if (document.startViewTransition) document.startViewTransition(swap)
      else swap()
    }
    addEventListener('popstate', sync)
    return () => removeEventListener('popstate', sync)
  }, [])
  return path
}

// ponytail: routes matched by hand; add a router when one needs more than a single key
function Routes({ path, session, project, organization = null, onWorkspaceChange }: { path: string; session: AuthSession | null; project: Project | null; organization?: Bootstrap['organization']; onWorkspaceChange?: (state: Bootstrap) => void }) {
  const item = path.match(/^\/(eventos|historias)\/(.+)$/)
  if (item) return <Article kind={item[1] === 'eventos' ? 'events' : 'stories'} itemKey={decodeURIComponent(item[2])} />
  return <Dashboard path={path} session={session} project={project} organization={organization} onWorkspaceChange={onWorkspaceChange} />
}

/** Session confirmation remains authoritative; screen navigation is local. */
function Gate({ path }: { path: string }) {
  const { data: session, isPending } = authClient.useSession()
  const [ready, setReady] = useState<{ userId: string; state: Bootstrap } | null>(null)
  const settled = useRef(false)
  if (!isPending) settled.current = true
  useEffect(() => { if (!session) setReady(null) }, [session])
  if (!settled.current) return <OnboardingLayout pending />
  const opened = !!session && ready?.userId === session.user.id
  return <>
    <Onboarding session={session} background={opened} onBlocked={() => setReady(null)} onReady={state => { if (session) { setReady({ userId: session.user.id, state }); restoreDestination() } }} />
    {opened && <Routes path={path} session={session} project={ready.state.project} organization={ready.state.organization} onWorkspaceChange={state => { if (session) setReady({ userId: session.user.id, state }) }} />}
  </>
}

function DashboardPreview({ path }: { path: string }) {
  const { data: session } = authClient.useSession()
  const [workspace, setWorkspace] = useState<{ userId: string; state: Bootstrap } | null>(null)
  useEffect(() => {
    if (!session) { setWorkspace(null); return }
    const controller = new AbortController()
    onboardingRequest<Bootstrap>('', undefined, controller.signal)
      .then(state => { if (!controller.signal.aborted) setWorkspace({ userId: session.user.id, state }) })
      .catch(() => { if (!controller.signal.aborted) setWorkspace(null) })
    return () => controller.abort()
  }, [session?.user.id])
  const state = workspace?.userId === session?.user.id ? workspace?.state : null
  return <Dashboard path={path.slice('/dashboard-preview'.length) || '/'} basePath="/dashboard-preview" session={session} project={state?.project ?? null} organization={state?.organization ?? null} onWorkspaceChange={state => { if (session) setWorkspace({ userId: session.user.id, state }) }} />
}

function App() {
  const path = usePath()
  if (import.meta.env.DEV && (path === '/dashboard-preview' || path.startsWith('/dashboard-preview/'))) return <DashboardPreview path={path} />
  if (path === '/reset-password' || path === '/account/password') return <PasswordRecovery change={path === '/account/password'} />
  if (import.meta.env.DEV && path === '/onboarding-preview') return <Onboarding preview />
  if (!AUTH_ENABLED) return <Routes path={path} session={null} project={null} />
  return <Gate path={path} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaConnection><App /></PwaConnection>
  </StrictMode>,
)
