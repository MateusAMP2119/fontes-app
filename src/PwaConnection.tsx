import { useEffect, useState, type ReactNode } from 'react'
import './pwa.css'

export default function PwaConnection({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [openedOffline, setOpenedOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const connected = () => { setOnline(true); setOpenedOffline(false) }
    const disconnected = () => setOnline(false)
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    return () => {
      window.removeEventListener('online', connected)
      window.removeEventListener('offline', disconnected)
    }
  }, [])

  if (openedOffline) return (
    <main className="pwa-offline">
      <img src="/mark.png" width="70" height="70" alt="Fontes" />
      <h1>Estás sem ligação à internet</h1>
      <p>Liga-te à internet para entrar no Fontes e carregar as notícias.</p>
      <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
    </main>
  )

  return <>
    {children}
    {!online && <div className="pwa-connection" role="status">
      Sem ligação à internet. As notícias e a sincronização regressam quando te voltares a ligar.
    </div>}
  </>
}
