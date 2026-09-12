import { NEWS_API as API } from './api'
import { useEffect, useRef, useState } from 'react'
import { mountQuery, type ModeKey } from './query'
import { type AuthSession } from './auth'
import { navigate } from './navigate'
import Feed from './Feed'
import { X } from 'lucide-react'
import './MakeApp.css'


/** The bit of GET /stories or GET /events a suggestion row needs. */
type Hit = { id: number; slug: string | null; title: string }

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
    <div className="make-shell">
      <div className="make-stage">
        <section className="make-hero" aria-labelledby="make-heading">
        <h1 id="make-heading">Explorar as notícias</h1>

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
                <X aria-hidden="true" size={16} />
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
                        <X aria-hidden="true" size={12} />
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

    </div>
  )
}
