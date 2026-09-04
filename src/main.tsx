import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import MakeApp from './MakeApp.tsx'
import Login from './Login.tsx'
import Article from './Article.tsx'
import { authClient, AUTH_ENABLED } from './auth'

// ponytail: three routes matched by hand; add a router when one needs more than a single key
function App() {
  const [path, setPath] = useState(location.pathname)
  // Held above the route swap so the landing and account menu share one source of truth.
  // eslint-disable-next-line react-hooks/rules-of-hooks -- constant condition, same hooks every render
  const session = AUTH_ENABLED ? authClient.useSession().data : null
  useEffect(() => {
    const sync = () => {
      const swap = () => flushSync(() => setPath(location.pathname))
      if (document.startViewTransition) document.startViewTransition(swap)
      else swap()
    }
    addEventListener('popstate', sync)
    return () => removeEventListener('popstate', sync)
  }, [])
  const item = path.match(/^\/(eventos|historias)\/(.+)$/)
  if (AUTH_ENABLED && path === '/login') return <Login />
  if (item) return <Article kind={item[1] === 'eventos' ? 'events' : 'stories'} itemKey={decodeURIComponent(item[2])} />
  return <MakeApp session={session} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
