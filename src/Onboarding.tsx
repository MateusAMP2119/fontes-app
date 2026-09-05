import { useState, type FormEvent } from 'react'
import { authClient } from './auth'
import { createProject } from './projects'
import './Login.css'

export type OnboardingStep = 'org' | 'project'

const copy: Record<OnboardingStep, { title: string; description: string; label: string; placeholder: string; submit: string; failed: string }> = {
  org: {
    title: 'Criar organização',
    description: 'Uma organização agrupa projetos e membros. O nome pode ser alterado mais tarde.',
    label: 'Nome da organização',
    placeholder: 'Ex.: Redação Norte',
    submit: 'Criar organização',
    failed: 'Não foi possível criar a organização. Tentar novamente.',
  },
  project: {
    title: 'Criar projeto',
    description: 'Um projeto guarda os painéis e as fontes de uma organização.',
    label: 'Nome do projeto',
    placeholder: 'Ex.: Eleições 2026',
    submit: 'Criar projeto',
    failed: 'Não foi possível criar o projeto. Tentar novamente.',
  },
}

// ponytail: the slug is never shown, so a random suffix beats a uniqueness round-trip
function slugFor(name: string) {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base || 'org'}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * First-run steps after sign-in. The gate in main.tsx picks the step from data
 * (no organization → org, no project → project), so closing the tab midway
 * resumes at the right place. Creating an organization refetches the list on
 * its own; creating a project calls `onDone` so the gate reloads projects.
 */
export default function Onboarding({ step, onDone }: { step: OnboardingStep; onDone?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const text = copy[step]

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name') ?? '').trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      if (step === 'org') {
        const { error } = await authClient.organization.create({ name, slug: slugFor(name) })
        if (error) throw error
      } else {
        await createProject(name)
      }
      onDone?.()
    } catch {
      setBusy(false)
      setError(text.failed)
    }
  }

  return (
    <main className="login-page">
      <div className="make-background" aria-hidden="true">
        <div className="make-purple-blob">
          <div className="make-purple-blob-primary" />
          <div className="make-purple-blob-secondary" />
        </div>
        <div className="make-background-grid" />
      </div>
      <span className="make-brand login-brand">
        <img className="make-mark" src="/mark.png" alt="" width={30} height={30} />
      </span>
      <section className="login-card" aria-labelledby="onboarding-title">
        <header>
          <p className="login-step">Passo {step === 'org' ? 1 : 2} de 2</p>
          <h1 id="onboarding-title">{text.title}</h1>
          <p>{text.description}</p>
        </header>
        <form onSubmit={submit}>
          <div className="login-field">
            <label htmlFor="name">{text.label}</label>
            <input
              key={step}
              id="name"
              name="name"
              type="text"
              placeholder={text.placeholder}
              maxLength={80}
              autoComplete="off"
              autoFocus
              required
            />
          </div>
          {error && (
            <p className="login-notice login-error" role="alert">{error}</p>
          )}
          <div className="login-buttons">
            <button className="login-button" type="submit" disabled={busy}>
              {busy ? 'A criar…' : text.submit}
            </button>
          </div>
        </form>
        <p className="login-switch">
          <button className="login-link" type="button" onClick={() => authClient.signOut()}>
            Terminar sessão
          </button>
        </p>
      </section>
    </main>
  )
}
