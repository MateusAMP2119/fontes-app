import { useEffect, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { mountQuery } from './query'
import { supabase } from './supabase'
import { navigate } from './navigate'
import './MakeApp.css'

type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron'

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
      {name === 'arrow-left' && <path d="M18 12H6m6-6-6 6 6 6" {...common} />}
      {name === 'arrow-right' && <path d="M6 12h12m-6-6 6 6-6 6" {...common} />}
    </svg>
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
                <button className="make-login" type="button" onClick={() => supabase.auth.signOut()}>
                  Sair
                </button>
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

        <section className="make-examples">
        <div className="make-examples-heading-row">
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
      </div>

    </main>
  )
}
