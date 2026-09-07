import PwaConnection from './PwaConnection'
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import MakeApp from './MakeApp.tsx'
import Article from './Article.tsx'
import Onboarding from './Onboarding.tsx'
import { authClient, AUTH_ENABLED, type AuthSession } from './auth'
import { type Project } from './projects'
import type { Bootstrap } from './onboardingSync'

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
function Routes({ path, session, project }: { path: string; session: AuthSession | null; project: Project | null }) {
  const item = path.match(/^\/(eventos|historias)\/(.+)$/)
  if (item) return <Article kind={item[1] === 'eventos' ? 'events' : 'stories'} itemKey={decodeURIComponent(item[2])} />
  return <MakeApp session={session} project={project} />
}

/** Session confirmation remains authoritative; screen navigation is local. */
function Gate({ path }: { path: string }) {
  const { data: session, isPending } = authClient.useSession()
  const [ready, setReady] = useState<{ userId: string; state: Bootstrap } | null>(null)
  const settled = useRef(false)
  if (!isPending) settled.current = true
  useEffect(() => { if (!session) setReady(null) }, [session])
  if (!settled.current) return null
  const opened = !!session && ready?.userId === session.user.id
  return <>
    <Onboarding session={session} background={opened} onReady={state => { if (session) setReady({ userId: session.user.id, state }) }} />
    {opened && <Routes path={path} session={session} project={ready.state.project} />}
  </>
}

function App() {
  const path = usePath()
  if (import.meta.env.DEV && path === '/onboarding-preview') return <Onboarding preview />
  if (!AUTH_ENABLED) return <Routes path={path} session={null} project={null} />
  return <Gate path={path} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaConnection><App /></PwaConnection>
  </StrictMode>,
)
