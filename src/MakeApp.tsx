import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { mountQuery } from './query'
import { supabase } from './supabase'
import { navigate } from './navigate'
import Feed from './Feed'
import './MakeApp.css'

type IconName = 'chevron' | 'log-out' | 'user'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      {name === 'chevron' && <path d="m8.5 10 3.5 3.5 3.5-3.5" {...common} />}
      {name === 'user' && <><circle cx="12" cy="8" r="3.25" {...common} /><path d="M5.5 19c.7-3.1 3-4.75 6.5-4.75S17.8 15.9 18.5 19" {...common} /></>}
      {name === 'log-out' && <><path d="M10 5H6.75A1.75 1.75 0 0 0 5 6.75v10.5C5 18.22 5.78 19 6.75 19H10" {...common} /><path d="m15 8 4 4-4 4m4-4H9" {...common} /></>}
    </svg>
  )
}

function AccountMenu({ session }: { session: Session }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="make-account" ref={menuRef}>
      <button
        className="make-account-trigger"
        type="button"
        aria-label="Abrir menu da conta"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="user" size={18} />
      </button>
      {open && (
        <div className="make-account-menu" role="menu">
          <div className="make-account-email" title={session.user.email}>Conta<br /><span>{session.user.email}</span></div>
          <div className="make-account-separator" />
          <button type="button" role="menuitem" onClick={() => supabase.auth.signOut()}>
            <Icon name="log-out" size={16} />
            Terminar sessão
          </button>
        </div>
      )}
    </div>
  )
}

export default function MakeApp({ session }: { session: Session | null }) {
  const queryRef = useRef<HTMLDivElement>(null)
  useEffect(() => (queryRef.current ? mountQuery(queryRef.current) : undefined), [])


  return (
    <main className="make-shell">
      <div className="make-stage">
        <header className="make-header">
          <div className="make-rail">
            <a className="make-brand" href="/" aria-label="Fontes, página inicial">
              <img className="make-mark" src="/mark.png" alt="" width={34} height={34} />
              <span aria-hidden="true">Fontes</span>
            </a>
            <div className="make-actions">
              <button className="make-file-name" type="button">
                Untitled <Icon name="chevron" size={14} />
              </button>
              {session ? (
                <AccountMenu session={session} />
              ) : (
                <a
                  className="make-login"
                  href="/login"
                  onClick={(event) => {
                    event.preventDefault()
                    navigate('/login')
                  }}
                >
                  Entrar
                </a>
              )}
            </div>
          </div>
        </header>

        <div className="make-background" aria-hidden="true">
          <div className="make-purple-blob">
            <div className="make-purple-blob-primary" />
            <div className="make-purple-blob-secondary" />
          </div>
          <div className="make-background-grid" />
        </div>

        <section className="make-hero" aria-labelledby="make-heading">
        <h1 id="make-heading">What do you want to make?</h1>

        <div className="make-query" ref={queryRef}>
          <label className="m-query-line">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 19.708c4.257 0 7.708-3.451 7.708-7.708S16.257 4.292 12 4.292M12 19.708c-4.257 0-7.708-3.451-7.708-7.708S7.743 4.292 12 4.292M12 19.708c-1.956 0-3.542-3.451-3.542-7.708S10.044 4.292 12 4.292M12 19.708c1.956 0 3.542-3.451 3.542-7.708S13.956 4.292 12 4.292M19.5 12h-15" />
            </svg>
            <input
              type="text"
              data-q-input=""
              aria-label="Pesquisa ou pedido"
              placeholder="Notícias de energia em Espanha"
              autoComplete="off"
            />
          </label>
          <div className="m-query-bar">
            <div className="m-tabs" role="tablist" aria-label="Modo">
              <i className="m-tabs-ind" aria-hidden="true" />
              <button type="button" className="m-tab" role="tab" aria-selected="true" data-q-mode="search">
                <canvas data-q-icon="search" aria-hidden="true" />
                <span>Procurar</span>
              </button>
              <button type="button" className="m-tab" role="tab" aria-selected="false" data-q-mode="build">
                <canvas data-q-icon="build" aria-hidden="true" />
                <span>Construir</span>
              </button>
            </div>
            <button type="button" className="m-run" aria-label="Executar">
              <span data-q-run-label="" />
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m11.7 4.8 5.2 5.2-5.2 5.2M16.9 10H3.1" />
              </svg>
            </button>
          </div>
        </div>
        </section>

        <Feed session={session} />
      </div>

    </main>
  )
}
