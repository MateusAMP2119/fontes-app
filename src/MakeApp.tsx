import { NEWS_API as API } from './api'
import { useEffect, useRef, useState } from 'react'
import { type AuthSession } from './auth'
import Feed from './Feed'
import { Search, X } from 'lucide-react'
import { Button } from './components/ui/button'
import './MakeApp.css'


/** The bit of GET /stories or GET /events a suggestion row needs. */
type Hit = { id: number; slug: string | null; title: string }

export default function MakeApp({ session }: { session: AuthSession | null }) {
  /** Card plus the suggestion sheet under it; outside-click and scroll target. */
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && inputRef.current?.getClientRects().length) {
        event.preventDefault()
        inputRef.current.focus()
        inputRef.current.select()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const [typed, setTyped] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  /** Stored searches; the feed shows stories matching any of them. fonteslabs.com's card hands its term over as `?q=`. */
  const [chips, setChips] = useState<string[]>(() => new URLSearchParams(location.search).getAll('q').map((q) => q.trim()).filter(Boolean))

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
        const response = await fetch(`${API}/stories?q=${encodeURIComponent(words)}&limit=6`, {
          signal: controller.signal,
        })
        if (response.ok) {
          const results = await response.json()
          if (!controller.signal.aborted) setHits(results)
        }
      } catch {
        // aborted by a newer keystroke, or offline: keep the last list
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

  const showList = open && typed.trim().length > 0 && hits.length > 0

  const clearInput = () => {
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

  const choose = (hit: Hit) => run(hit.title)

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
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
      else run(event.currentTarget.value)
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
        <form className="news-search-bar" role="search" onSubmit={(event) => { event.preventDefault(); run(typed) }}>
          <div className="news-search-line">
            <Button type="submit" variant="ghost" size="icon" className="news-search-submit" aria-label="Pesquisar notícias"><Search aria-hidden="true" /></Button>
            <input
              ref={inputRef}
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
              aria-expanded={showList}
              aria-controls="m-suggest"
              aria-activedescendant={showList && active >= 0 ? `m-suggest-${hits[active].id}` : undefined}
              onChange={(event) => {
                setTyped(event.currentTarget.value)
                setHits([])
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
            {!typed && <span className="news-search-shortcut" aria-hidden="true"><kbd>{shortcut}</kbd><kbd>K</kbd></span>}
          </div>
        </form>
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
