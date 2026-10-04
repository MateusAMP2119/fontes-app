import OnboardingLayout from './OnboardingLayout'
import { restoreDestination } from './authDestination'
import PasswordRecovery from './Password'
import PwaConnection from './PwaConnection'
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { transitionView } from './viewTransition'
import './index.css'
import Dashboard from './Dashboard'
import './shadcn.css'
import Onboarding from './Onboarding.tsx'
import { authClient } from './auth'
import { type Bootstrap } from './onboardingSync'

function usePath() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const sync = () => {
      transitionView(() => setPath(location.pathname))
    }
    addEventListener('popstate', sync)
    return () => removeEventListener('popstate', sync)
  }, [])
  return path
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
    {opened && <Dashboard key={session.session.id} path={path} session={session} project={ready.state.project} organization={ready.state.organization} onWorkspaceChange={state => { if (session) setReady({ userId: session.user.id, state }) }} />}
  </>
}

function App() {
  const path = usePath()
  if (path === '/reset-password' || path === '/account/password') return <PasswordRecovery change={path === '/account/password'} />
  return <Gate path={path} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaConnection><App /></PwaConnection>
  </StrictMode>,
)
