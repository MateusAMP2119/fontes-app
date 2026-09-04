import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import MakeApp from './MakeApp.tsx'
import Login from './Login.tsx'
import { authClient } from './auth'

// ponytail: two routes, no router; add one when a third page shows up
function App() {
  const [path, setPath] = useState(location.pathname)
  // Held above the route swap so the landing and account menu share one source of truth.
  const { data: session } = authClient.useSession()
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
