import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import MakeApp from './MakeApp.tsx'
import Login from './Login.tsx'
import Article from './Article.tsx'
import Onboarding from './Onboarding.tsx'
import { authClient, AUTH_ENABLED, type AuthSession } from './auth'
import { useProjects, type Project } from './projects'

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

/**
 * Everything sits behind a session, and a session behind an organization and a
 * project. Each step is derived from data, so a half-finished onboarding resumes
 * where it stopped on the next sign-in.
 */
function Gate({ path }: { path: string }) {
  const { data: session, isPending } = authClient.useSession()
  // Better Auth reports isPending on every refetch while data is null, e.g. right after
  // sign-up. Blank only before the first answer, otherwise Login would unmount mid-flow.
  const settled = useRef(false)
  if (!isPending) settled.current = true
  if (!settled.current) return null
  // First contact is account creation; /login stays the returning-user entry.
  if (!session) return <Login initialMode="signup" />
  return <Workspace path={path} session={session} />
}

/** Mounted only with a session, so the organization and project lookups never run signed out. */
function Workspace({ path, session }: { path: string; session: AuthSession }) {
  const orgs = authClient.useListOrganizations()
  const hasOrg = (orgs.data?.length ?? 0) > 0
  const projects = useProjects(hasOrg)
  if (orgs.isPending) return null
  if (!hasOrg) return <Onboarding key="org" step="org" />
  if (!session.user.username) return <Onboarding key="username" step="username" />
  if (projects.pending) return null
  if (projects.list.length === 0) return <Onboarding key="project" step="project" onDone={projects.refresh} />
  // ponytail: first project is the active one; add a switcher when a second project exists
  return <Routes path={path} session={session} project={projects.list[0]} />
}

function App() {
  const path = usePath()
  if (!AUTH_ENABLED) return <Routes path={path} session={null} project={null} />
  if (path === '/login') return <Login />
  return <Gate path={path} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
