import { useEffect, useState, type ReactNode } from 'react'
import './Onboarding.css'

/** Keep authentication, recovery and setup on the same stable surface. */
export default function OnboardingLayout({ children, brand, footer, pending = false }: { children?: ReactNode; brand?: ReactNode; footer?: ReactNode; pending?: boolean }) {
  const [light, setLight] = useState(() => !matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const update = () => setLight(!media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const previous = themeColor?.content
    if (themeColor) themeColor.content = light ? '#ffffff' : '#101012'
    return () => { if (themeColor && previous) themeColor.content = previous }
  }, [light])
  return <main className="ob-page" data-theme={light ? 'light' : 'dark'}>
    <div className="make-background ob-background" aria-hidden="true">
      <div className="make-purple-blob"><div className="make-purple-blob-primary"/><div className="make-purple-blob-secondary"/></div>
      <div className="make-background-grid"/>
    </div>
    {!pending && <div className="ob-stage">
      {brand || <span className="ob-brand"><img src="/mark.png" width="36" height="36" alt="Fontes"/></span>}
      {children}
    </div>}
    {footer}
  </main>
}
