import { useEffect, useRef, useState, type RefObject } from 'react'
import { mountQuery, type ModeKey } from './query'
import { authClient, AUTH_ENABLED, type AuthSession } from './auth'
import { navigate } from './navigate'
import Feed from './Feed'
import './MakeApp.css'

const API = import.meta.env.VITE_API_URL as string

/** The bit of GET /stories or GET /events a suggestion row needs. */
type Hit = { id: number; slug: string | null; title: string }

type IconName = 'check' | 'chevron' | 'close' | 'log-in' | 'log-out' | 'share'

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = STROKE

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      {name === 'check' && <path d="m5 12 5 5L20 7" {...common} strokeWidth={2} />}
      {name === 'chevron' && <path d="m8.5 10 3.5 3.5 3.5-3.5" {...common} />}
      {name === 'close' && <path d="m7 7 10 10M17 7 7 17" {...common} />}
      {name === 'log-in' && <><path d="M14 5h3.25c.97 0 1.75.78 1.75 1.75v10.5c0 .97-.78 1.75-1.75 1.75H14" {...common} /><path d="m10 8 4 4-4 4m4-4H4" {...common} /></>}
      {name === 'share' && <path d="M8 9H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1m-4 5V3M9 6l3-3 3 3" {...common} strokeWidth={2} />}
      {name === 'log-out' && <><path d="M10 5H6.75A1.75 1.75 0 0 0 5 6.75v10.5C5 18.22 5.78 19 6.75 19H10" {...common} /><path d="m15 8 4 4-4 4m4-4H9" {...common} /></>}
    </svg>
  )
}

const SYNC_STATES = ['saved', 'syncing', 'unsynced', 'failed'] as const
type SyncState = (typeof SYNC_STATES)[number]
const SYNC_LABEL: Record<SyncState, string> = {
  saved: 'Guardado',
  syncing: 'A sincronizar',
  unsynced: 'Por sincronizar',
  failed: 'Erro ao sincronizar',
}

/** Sync status on the Tabler cloud glyphs (MIT, tabler.io/icons): check, upload, off, x. */
function SyncCloud({ state }: { state: SyncState }) {
  const line = { ...STROKE, strokeWidth: 2 }
  return (
    <span className="make-cloud" data-state={state} role="img" aria-label={SYNC_LABEL[state]} title={SYNC_LABEL[state]}>
      <svg aria-hidden="true" width={16} height={16} viewBox="0 0 24 24">
        {state === 'saved' && <path d="M11 18.004H6.657C4.085 18 2 15.993 2 13.517s2.085-4.482 4.657-4.482c.393-1.762 1.794-3.2 3.675-3.773c1.88-.572 3.956-.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.388 0 2.585.82 3.138 2.007M15 19l2 2l4-4" {...line} />}
        {state === 'syncing' && <><path d="M7 18a4.6 4.4 0 0 1 0-9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" {...line} /><path className="make-cloud-up" d="m9 15l3-3l3 3m-3-3v9" {...line} /></>}
        {state === 'unsynced' && <path d="M9.58 5.548q.361-.166.752-.286c1.88-.572 3.956-.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 .957-.383 1.824-1.003 2.454M18 18.004H6.657C4.085 18 2 15.993 2 13.517s2.085-4.482 4.657-4.482c.13-.582.37-1.128.7-1.62M3 3l18 18" {...line} />}
        {state === 'failed' && <path d="M13 18.004H6.657C4.085 18 2 15.993 2 13.517s2.085-4.482 4.657-4.482c.393-1.762 1.794-3.2 3.675-3.773c1.88-.572 3.956-.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.37 0 2.556.8 3.117 1.964M22 22l-5-5m0 5l5-5" {...line} />}
      </svg>
    </span>
  )
}

/** Shares the page link through the OS sheet where there is one, else copies it and flashes a check. */
function ShareButton() {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = location.href
    if (navigator.share) {
      await navigator.share({ url }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const label = copied ? 'Ligação copiada' : 'Partilhar ligação'
  return (
    <button className="make-share" type="button" aria-label={label} title={label} onClick={share}>
      <Icon name={copied ? 'check' : 'share'} size={16} />
    </button>
  )
}

/** "Mateus Costa" → "MC", "mateus" → "M", no name → the email's first letter. */
function initials({ name, email }: AuthSession['user']) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0]?.[0] ?? email[0])
  return letters.toUpperCase()
}

/** Closes a popover on a pointer-down outside `ref` or on Escape. */
function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
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
  }, [ref, open, setOpen])
}

/** Where saved searches and events will live: the file control from the old header, an empty state under it until saving ships. */
function SavedMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, setOpen)

  return (
    <div ref={ref}>
      <button
        className="make-file-name"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Sem título
        <Icon name="chevron" size={14} />
      </button>
      {open && (
        <div className="make-account-menu" role="dialog" aria-label="Guardados">
          <p className="make-saved-empty">As pesquisas e os eventos guardados aparecem aqui.</p>
        </div>
      )}
    </div>
  )
}

function AccountMenu({ session }: { session: AuthSession }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useDismiss(menuRef, open, setOpen)

  return (
    <div ref={menuRef}>
      <button
        className="make-account-trigger"
        type="button"
        aria-label="Abrir menu da conta"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="make-initials" aria-hidden="true">{initials(session.user)}</span>
      </button>
      {open && (
        <div className="make-account-menu" role="menu">
          <div className="make-account-email" title={session.user.email}>Conta<br /><span>{session.user.email}</span></div>
          <div className="make-account-separator" />
          <button type="button" role="menuitem" onClick={() => authClient.signOut()}>
            <Icon name="log-out" size={16} />
            Terminar sessão
          </button>
        </div>
      )}
    </div>
  )
}

/** Time-of-day greeting from the visitor's clock, European Portuguese cutoffs. */
function greeting(hour = new Date().getHours()) {
  if (hour < 6) return 'Boa noite'
  if (hour < 13) return 'Bom dia'
  if (hour < 20) return 'Boa tarde'
  return 'Boa noite'
}

export default function MakeApp({ session }: { session: AuthSession | null }) {
  const queryRef = useRef<HTMLDivElement>(null)
  /** Card plus the suggestion sheet under it; outside-click and scroll target. */
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  /** The card's tab: search stores terms for the feed, build opens one event. */
  const [mode, setMode] = useState<ModeKey>('search')
  useEffect(() => (queryRef.current ? mountQuery(queryRef.current, setMode) : undefined), [])

  // Live suggestions: story or event titles from the API as the user types. `typed`
  // follows every keystroke; `search` is what the feed shows, set on Enter,
  // the run button, or a pick.
  const [typed, setTyped] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  /** Stored searches; the feed shows stories matching any of them. fonteslabs.com's card hands its term over as `?q=`. */
  const [chips, setChips] = useState<string[]>(() => new URLSearchParams(location.search).getAll('q').map((q) => q.trim()).filter(Boolean))
  const token = undefined
  // ponytail: nothing syncs yet; `?sync=syncing|unsynced|failed` previews the states until a real one exists
  const sync = SYNC_STATES.find((state) => state === new URLSearchParams(location.search).get('sync')) ?? 'saved'

  useEffect(() => {
    const q = typed.trim()
    if (!q) {
      setHits([])
      return
    }
    const controller = new AbortController()
    // ponytail: fixed 120ms debounce; the API takes prefixes, so no min length.
    const timer = window.setTimeout(async () => {
      try {
        // the API matches whole words, so "vice-presidente" must go up as two
        const words = q.replace(/[^\p{L}\p{N}]+/gu, ' ')
        const response = await fetch(`${API}/${mode === 'build' ? 'events' : 'stories'}?q=${encodeURIComponent(words)}&limit=6`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        })
        if (response.ok) setHits(await response.json())
      } catch {
        // aborted by a newer keystroke, or offline: keep the last list
      }
    }, 120)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [typed, token, mode])

  // Clicks outside the card close the list; blur would fire before a tap on
  // a row lands on touch screens.
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const showList = open && typed.trim().length > 0 && hits.length > 0

  const clearInput = () => {
    const input = inputRef.current
    if (input && input.value) {
      input.value = ''
      // query.ts reads dirtiness off the native event
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    setTyped('')
  }

  /** Stores the term as a chip and empties the field for the next one. */
  const run = (value: string) => {
    const term = value.trim()
    if (term && !chips.some((chip) => chip.toLowerCase() === term.toLowerCase())) setChips([...chips, term])
    clearInput()
    setOpen(false)
    // drops the phone keyboard so the results are not under it
    inputRef.current?.blur()
  }

  /** Build mode: opens the event's article page. */
  const pick = (hit: Hit) => navigate(`/eventos/${hit.slug ?? hit.id}`)

  /** A row click, or Enter and the run button: build mode opens the highlighted suggestion, else the first. */
  const choose = (hit: Hit) => (mode === 'build' ? pick(hit) : run(hit.title))
  const submit = (value: string) => {
    if (mode === 'build') {
      const hit = hits[Math.max(active, 0)]
      if (hit) pick(hit)
      return
    }
    run(value)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && hits.length) {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % hits.length)
    } else if (event.key === 'ArrowUp' && hits.length) {
      event.preventDefault()
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (showList && active >= 0) choose(hits[active])
      else submit(event.currentTarget.value)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <main className="make-shell">
      <div className="make-stage">
        <header className="make-header">
          <div className="make-rail">
            <div className="make-brand">
              <a className="make-home" href="/" aria-label="Fontes, página inicial">
                <img className="make-mark" src="/mark.png" alt="" width={34} height={34} />
              </a>
              <i className="make-divider" aria-hidden="true" />
              {/* ponytail: static name; read it from the account once organisations exist */}
              <span className="make-org">Fontes Labs</span>
            </div>
            <div className="make-actions">
              <SyncCloud state={sync} />
              <i className="make-divider" aria-hidden="true" />
              <SavedMenu />
              <i className="make-divider" aria-hidden="true" />
              <ShareButton />
              {AUTH_ENABLED && (
                <>
                  <i className="make-divider" aria-hidden="true" />
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
                      <span>
                        <Icon name="log-in" size={16} />
                        Entrar
                      </span>
                    </a>
                  )}
                </>
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
        <h1 id="make-heading">{greeting()}. Por onde começar?</h1>

        <div className="make-search" ref={searchRef}>
        <div className="make-query" ref={queryRef}>
          <label className="m-query-line">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 19.708c4.257 0 7.708-3.451 7.708-7.708S16.257 4.292 12 4.292M12 19.708c-4.257 0-7.708-3.451-7.708-7.708S7.743 4.292 12 4.292M12 19.708c-1.956 0-3.542-3.451-3.542-7.708S10.044 4.292 12 4.292M12 19.708c1.956 0 3.542-3.451 3.542-7.708S13.956 4.292 12 4.292M19.5 12h-15" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              data-q-input=""
              aria-label="Pesquisa ou pedido"
              placeholder="Notícias de energia em Espanha"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showList}
              aria-controls="m-suggest"
              aria-activedescendant={showList && active >= 0 ? `m-suggest-${hits[active].id}` : undefined}
              onInput={(event) => {
                setTyped(event.currentTarget.value)
                setActive(-1)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
            />
            {typed && (
              <button
                type="button"
                className="m-clear"
                aria-label="Limpar texto"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  clearInput()
                  inputRef.current?.focus()
                }}
              >
                <Icon name="close" size={16} />
              </button>
            )}
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
            <button type="button" className="m-run" aria-label="Executar" onClick={() => submit(inputRef.current?.value ?? '')}>
              <span data-q-run-label="" />
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m11.7 4.8 5.2 5.2-5.2 5.2M16.9 10H3.1" />
              </svg>
            </button>
          </div>
        </div>
          {/* one sheet under the card: suggestions on top, the stored searches as chips under a rule */}
          {(showList || chips.length > 0) && (
            <div className="m-sheet">
              {showList && (
                <ul className="m-suggest" id="m-suggest" role="listbox" aria-label="Sugestões">
                  {hits.map((hit, i) => (
                    <li
                      key={hit.id}
                      id={`m-suggest-${hit.id}`}
                      role="option"
                      aria-selected={i === active}
                      onPointerEnter={() => setActive(i)}
                      onClick={() => choose(hit)}
                    >
                      {hit.title}
                    </li>
                  ))}
                </ul>
              )}
              {chips.length > 0 && (
                <div className="m-chips" role="list" aria-label="Pesquisas guardadas">
                  {chips.map((chip) => (
                    <span className="m-chip" role="listitem" key={chip}>
                      <span>{chip}</span>
                      <button
                        type="button"
                        aria-label={`Remover ${chip}`}
                        onClick={() => setChips(chips.filter((other) => other !== chip))}
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </section>

        <Feed session={session} queries={chips} />
      </div>

    </main>
  )
}
