import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { Session } from '@supabase/supabase-js'
import './index.css'
import MakeApp from './MakeApp.tsx'
import Login from './Login.tsx'
import { supabase } from './supabase'

// ponytail: two routes, no router; add one when a third page shows up
function App() {
  const [path, setPath] = useState(location.pathname)
  // Held here, above the swap, so the landing mounts already knowing who is signed in.
  const [session, setSession] = useState<Session | null>(null)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    const sync = () => {
      const swap = () => flushSync(() => setPath(location.pathname))
      if (document.startViewTransition) document.startViewTransition(swap)
      else swap()
    }
    addEventListener('popstate', sync)
    return () => removeEventListener('popstate', sync)
  }, [])
  return path === '/login' ? <Login /> : <MakeApp session={session} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
