import { useEffect, useState } from 'react'
import './MakeApp.css'

type IconName =
  | 'ai'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'chevron'
  | 'magic'
  | 'microphone'
  | 'monitor'
  | 'moon'
  | 'plus'
  | 'settings'
  | 'sun'

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
      {name === 'plus' && <path d="M12 5v14M5 12h14" {...common} />}
      {name === 'chevron' && <path d="m8.5 10 3.5 3.5 3.5-3.5" {...common} />}
      {name === 'arrow-left' && <path d="m14.5 6-6 6 6 6M9 12h10" {...common} />}
      {name === 'arrow-right' && <path d="m9.5 6 6 6-6 6M5 12h10" {...common} />}
      {name === 'arrow-up' && <path d="m6 10 6-6 6 6M12 4v16" {...common} />}
      {name === 'microphone' && (
        <>
          <rect x="8" y="3" width="8" height="13" rx="4" {...common} />
          <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" {...common} />
        </>
      )}
      {name === 'monitor' && (
        <>
          <rect x="3" y="4" width="18" height="13" rx="2" {...common} />
          <path d="M8 21h8M12 17v4" {...common} />
        </>
      )}
      {name === 'moon' && <path d="M20 15.4A8 8 0 0 1 8.6 4a8 8 0 1 0 11.4 11.4Z" {...common} />}
      {name === 'sun' && (
        <>
          <circle cx="12" cy="12" r="3.5" {...common} />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" {...common} />
        </>
      )}
      {name === 'settings' && (
        <>
          <circle cx="12" cy="12" r="3.2" {...common} />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.55v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.3V9.55h.09A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.56 3.7l.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.3h4.05v.09A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4.05h-.09A1.7 1.7 0 0 0 19.4 15Z" {...common} />
        </>
      )}
      {name === 'magic' && (
        <>
          <path d="m5 19 10.5-10.5 3 3L8 22H5v-3Z" {...common} />
          <path d="m13.5 10.5 3 3M6 3v3M4.5 4.5h3M15.5 2.5v3M14 4h3M5.5 10v2M4.5 11h2" {...common} />
        </>
      )}
      {name === 'ai' && (
        <rect x="3.5" y="4.5" width="17" height="15" rx="5" {...common} />
      )}
    </svg>
  )
}

function FigmaMark() {
  return (
    <span className="make-figma-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

const examples = [
  {
    image: '/make-examples/travel.png',
    title: 'Travel App Prototype',
    author: 'Brand Studio',
  },
  {
    image: '/make-examples/climate.png',
    title: 'Climate Dashboard',
    author: 'Brand Studio',
  },
  {
    image: '/make-examples/design-system.png',
    title: 'Design System SaaS Landing Page',
    author: 'Zayden Cho',
  },
]

type Theme = 'dark' | 'light'
type ThemePreference = 'system' | Theme

const themeStorageKey = 'fontes-make-theme-v3'

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function MakeApp() {
  const [prompt, setPrompt] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const stored = window.localStorage.getItem(themeStorageKey)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)
  const theme = themePreference === 'system' ? systemTheme : themePreference

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncSystemTheme = (event: MediaQueryListEvent | MediaQueryList) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    syncSystemTheme(media)
    media.addEventListener('change', syncSystemTheme)
    return () => media.removeEventListener('change', syncSystemTheme)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, themePreference)
    document.documentElement.style.colorScheme = theme
    document.body.dataset.makeTheme = theme
    return () => {
      delete document.body.dataset.makeTheme
    }
  }, [theme, themePreference])

  useEffect(() => {
    if (!settingsOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [settingsOpen])

  return (
    <main className="make-shell" data-theme={theme}>
      <div className="make-stage">
        <header className="make-header">
        <div className="make-header-left">
          <button className="make-figma-button" type="button" aria-label="Figma menu">
            <FigmaMark />
            <Icon name="chevron" size={14} />
          </button>
          <button className="make-file-name" type="button">
            Untitled <Icon name="chevron" size={14} />
          </button>
          <span className="make-plan">Free</span>
        </div>
        <div className="make-header-right">
          <button className="make-ai-button" type="button" aria-label="AI">
            <span>AI</span>
          </button>
          <button
            className="make-icon-button make-settings"
            type="button"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Icon name="settings" size={26} />
          </button>
        </div>
        {settingsOpen && (
          <div className="make-settings-popover" role="dialog" aria-label="Settings">
            <p>Appearance</p>
            <div className="make-theme-options" role="group" aria-label="Color theme">
              <button
                type="button"
                className={themePreference === 'system' ? 'is-selected' : ''}
                aria-pressed={themePreference === 'system'}
                onClick={() => {
                  setThemePreference('system')
                  setSettingsOpen(false)
                }}
              >
                <Icon name="monitor" size={18} />
                System
                <span aria-hidden="true" />
              </button>
              <button
                type="button"
                className={themePreference === 'light' ? 'is-selected' : ''}
                aria-pressed={themePreference === 'light'}
                onClick={() => {
                  setThemePreference('light')
                  setSettingsOpen(false)
                }}
              >
                <Icon name="sun" size={18} />
                Light
                <span aria-hidden="true" />
              </button>
              <button
                type="button"
                className={themePreference === 'dark' ? 'is-selected' : ''}
                aria-pressed={themePreference === 'dark'}
                onClick={() => {
                  setThemePreference('dark')
                  setSettingsOpen(false)
                }}
              >
                <Icon name="moon" size={18} />
                Dark
                <span aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
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

        <form className="make-composer" onSubmit={(event) => event.preventDefault()}>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe your idea. Attach a design to guide the result."
            aria-label="Describe what you want to make"
            rows={2}
          />
          <div className="make-composer-row">
            <div className="make-composer-left">
              <button className="make-round-button" type="button" aria-label="Add attachment">
                <Icon name="plus" size={24} />
              </button>
              <button className="make-round-button make-magic" type="button" aria-label="Enhance prompt">
                <Icon name="magic" size={24} />
              </button>
            </div>
            <div className="make-composer-right">
              <button className="make-select-button" type="button">
                Build <Icon name="chevron" size={14} />
              </button>
              <button className="make-select-button" type="button">
                Default <Icon name="chevron" size={14} />
              </button>
              <button className="make-round-button make-mic" type="button" aria-label="Voice prompt">
                <Icon name="microphone" size={22} />
              </button>
              <button className="make-round-button make-submit" type="submit" aria-label="Submit prompt">
                <Icon name="arrow-up" size={23} />
              </button>
            </div>
          </div>
        </form>
        </section>

        <section className="make-examples" aria-labelledby="examples-heading">
        <div className="make-examples-heading-row">
          <h2 id="examples-heading">Start from an example</h2>
          <div className="make-example-actions">
            <button className="make-see-more" type="button">See more</button>
            <button className="make-round-button" type="button" aria-label="Previous examples">
              <Icon name="arrow-left" size={20} />
            </button>
            <button className="make-round-button" type="button" aria-label="Next examples">
              <Icon name="arrow-right" size={20} />
            </button>
          </div>
        </div>

        <div className="make-example-grid">
          {examples.map((example) => (
            <article className="make-example" key={example.title}>
              <button className="make-example-image-button" type="button" aria-label={`Open ${example.title}`}>
                <img src={example.image} alt="" />
              </button>
              <h3>{example.title}</h3>
              <p>by {example.author}</p>
            </article>
          ))}
        </div>
        </section>

        <button className="make-help" type="button" aria-label="Help">?</button>
      </div>
    </main>
  )
}
