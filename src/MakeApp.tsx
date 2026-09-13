import { NEWS_API as API } from './api'
import { useEffect, useRef, useState } from 'react'
import { type AuthSession } from './auth'
import Feed from './Feed'
import Briefing from './Briefing'
import Rankings from './Rankings'
import AgentSetup from './AgentSetup'
import { ArrowRight, History, Lightbulb, Search, X } from 'lucide-react'
import { Button } from './components/ui/button'
import './MakeApp.css'
import './NewsSearch.css'


/** The bit of GET /stories or GET /events a suggestion row needs. */
type Hit = { id: number; slug: string | null; title: string }

export default function MakeApp({ session }: { session: AuthSession | null }) {
  /** Card plus the suggestion sheet under it; outside-click and scroll target. */
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const modalInputRef = useRef<HTMLInputElement>(null)
  const restoringFocus = useRef(false)
  const [modal, setModal] = useState(false)
  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && inputRef.current?.getClientRects().length) {
        event.preventDefault()
        setOpen(false)
        setModal(value => !value)
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (modal) {
      dialog.showModal()
      modalInputRef.current?.focus()
    } else if (dialog.open) {
      restoringFocus.current = true
      dialog.close()
      restoringFocus.current = false
    }
  }, [modal])

  const [typed, setTyped] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('fontes:recent-searches') || '[]')
      return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string').slice(0, 5) : []
    } catch { return [] }
  })
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error'>('idle')
  /** Stored searches; the feed shows stories matching any of them. fonteslabs.com's card hands its term over as `?q=`. */
  const [chips, setChips] = useState<string[]>(() => new URLSearchParams(location.search).getAll('q').map((q) => q.trim()).filter(Boolean))

  useEffect(() => {
    const q = typed.trim()
    if (!q) {
      setHits([])
      setSearchState('idle')
      return
    }
    setSearchState('loading')
    const controller = new AbortController()
    // ponytail: fixed 120ms debounce; the API takes prefixes, so no min length.
    const timer = window.setTimeout(async () => {
      try {
        // the API matches whole words, so "vice-presidente" must go up as two
        const words = q.replace(/[^\p{L}\p{N}]+/gu, ' ')
        const response = await fetch(`${API}/stories?q=${encodeURIComponent(words)}&limit=6`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Search failed')
        if (response.ok) {
          const results = await response.json()
          if (!controller.signal.aborted) { setHits(results); setSearchState('idle') }
        }
      } catch {
        if (!controller.signal.aborted) { setHits([]); setSearchState('error') }
      }
    }, 120)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [typed])

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

  // Consume Escape before Safari can also use it to leave fullscreen.
  useEffect(() => {
    if (!open && !modal) return
    const dismissSearch = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return
      event.preventDefault()
      event.stopImmediatePropagation()
      setModal(false)
      setOpen(false)
    }
    window.addEventListener('keydown', dismissSearch, true)
    return () => window.removeEventListener('keydown', dismissSearch, true)
  }, [open, modal])

  const showList = open && !modal
  const hasQuery = typed.trim().length > 0
  const suggestions = hasQuery ? hits.map(hit => hit.title) : recent
  const tips = ['Política', 'Economia', 'Portugal']
  const options = hasQuery ? suggestions : [...suggestions, ...tips]

  const clearInput = () => {
    setTyped('')
    setActive(-1)
  }

  /** Stores the term as a chip and empties the field for the next one. */
  const run = (value: string) => {
    const term = value.trim()
    if (term && !chips.some((chip) => chip.toLowerCase() === term.toLowerCase())) setChips([...chips, term])
    if (term) {
      const next = [term, ...recent.filter(item => item.toLowerCase() !== term.toLowerCase())].slice(0, 5)
      setRecent(next)
      try { localStorage.setItem('fontes:recent-searches', JSON.stringify(next)) } catch { /* Storage may be unavailable. */ }
    }
    clearInput()
    setOpen(false)
    setModal(false)
    // drops the phone keyboard so the results are not under it
    inputRef.current?.blur()
  }


  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown' && options.length) {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % options.length)
    } else if (event.key === 'ArrowUp' && options.length) {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if ((showList || modal) && options[active]) run(options[active])
      else run(event.currentTarget.value)
    }
  }

  const renderSearch = (isModal: boolean) => <>
        <form className="news-search-bar" role="search" onSubmit={(event) => { event.preventDefault(); run(typed) }}>
          <div className="news-search-line">
            <Button type="button" onClick={() => { setOpen(!isModal); (isModal ? modalInputRef : inputRef).current?.focus() }} variant="ghost" size="icon" className="news-search-submit" aria-label="Pesquisar notícias"><Search aria-hidden="true" /></Button>
            <input
              ref={isModal ? modalInputRef : inputRef}
              type="text"
              value={typed}
              aria-label="Pesquisar notícias"
              placeholder="Pesquisar notícias..."
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isModal || showList}
              aria-controls={isModal ? "m-modal-suggest" : "m-suggest"}
              aria-activedescendant={(isModal || showList) && options[active] ? `${isModal ? "m-modal-suggest" : "m-suggest"}-${active}` : undefined}
              onChange={(event) => {
                setTyped(event.currentTarget.value)
                setHits([])
                setActive(-1)
                setOpen(!isModal)
              }}
              onFocus={() => { if (!isModal && !restoringFocus.current) setOpen(!isModal) }}
              onClick={() => setOpen(!isModal)}
              onKeyDown={onKeyDown}
            />
            {typed && (
              <button
                type="button"
                className="m-clear"
                aria-label="Limpar texto"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  clearInput();
                  (isModal ? modalInputRef : inputRef).current?.focus()
                }}
              >
                <X aria-hidden="true" size={16} />
              </button>
            )}
            {!isModal && !typed && <span className="news-search-shortcut" aria-hidden="true"><kbd>{shortcut}</kbd><kbd>K</kbd></span>}
            {isModal && <button type="button" className="news-search-escape" aria-label="Fechar pesquisa" onClick={() => setModal(false)}>Esc</button>}
          </div>
        </form>
          {(isModal || showList) && (
            <div className="news-search-menu">
              <div className="news-search-results">
                <ul id={isModal ? "m-modal-suggest" : "m-suggest"} role="listbox" aria-label="Sugestões de pesquisa">
                  {(hasQuery || recent.length > 0) && <li role="presentation" className="news-search-label">{hasQuery ? 'Histórias' : 'Pesquisas recentes'}</li>}
                  {options.map((title, i) => (
                    <li role="presentation" key={`${i}-${title}`}>
                      {!hasQuery && i === recent.length && <div className="news-search-label">Sugestões de pesquisa</div>}
                      <div id={`${isModal ? "m-modal-suggest" : "m-suggest"}-${i}`} role="option" aria-selected={i === active}
                        className="news-search-option" onPointerEnter={() => setActive(i)}
                        onPointerDown={event => event.preventDefault()} onClick={() => run(title)}>
                        {hasQuery ? <Search /> : i < recent.length ? <History /> : <Lightbulb />}
                        <span>{title}</span>
                        {!hasQuery && i >= recent.length && <small>Pesquisar notícias</small>}
                        <ArrowRight className="news-search-arrow" />
                      </div>
                    </li>
                  ))}
                </ul>
                {hasQuery && hits.length === 0 && <p className="news-search-message" role="status">
                  {searchState === 'loading' ? 'A pesquisar histórias…' : searchState === 'error' ? 'Não foi possível carregar sugestões. A pesquisa continua disponível com Enter.' : 'Sem sugestões. Enter para pesquisar este tema.'}
                </p>}
              </div>
              <div className="news-search-footer" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd><span>Navegar</span><kbd>↵</kbd><span>Selecionar</span><kbd>esc</kbd><span>Fechar</span></div>
            </div>
          )}
  </>

  return (
    <div className="make-shell">
      <dialog ref={dialogRef} className="news-search-dialog" aria-label="Pesquisar notícias"
        onCancel={event => { event.preventDefault(); setModal(false); setOpen(false) }}
        onClose={() => { setModal(false); setOpen(false) }}
        onClick={event => { if (event.target === event.currentTarget) { setModal(false); setOpen(false) } }}>
        <div className="news-search-dialog-content">{modal && renderSearch(true)}</div>
      </dialog>
      <div className="make-stage">
        <section className="make-hero" aria-labelledby="make-heading">
        <AgentSetup />
        <h1 id="make-heading">Explorar as notícias</h1>

        <div className="make-search" ref={searchRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
          {renderSearch(false)}
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
                        <X aria-hidden="true" size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
        </div>
        <Briefing session={session} />
        <Rankings session={session} />
        </section>
        <Feed session={session} queries={chips} />
      </div>

    </div>
  )
}
