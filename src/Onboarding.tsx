import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { authClient } from './auth'
import { createProject } from './projects'
import './Login.css'

export type OnboardingStep = 'org' | 'username' | 'project'

const copy: Record<OnboardingStep, { title: string; description: string; label: string; submit: string; failed: string }> = {
  org: {
    title: 'Criar organização',
    description: 'Organizações agrupam projetos e membros.',
    label: 'Nome da organização',
    submit: 'Criar organização',
    failed: 'Não foi possível criar a organização. Tentar novamente.',
  },
  username: {
    title: 'Escolher nome de utilizador',
    description: 'Este nome serve de identificador dentro da organização.',
    label: 'Nome de utilizador',
    submit: 'Continuar',
    failed: 'Não foi possível guardar o nome de utilizador. Tentar novamente.',
  },
  project: {
    title: 'Criar um projeto',
    description: 'Um projeto agrupa pesquisas, notas e infográficos.',
    label: 'Nome do projeto',
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

function OrganizationCodeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: 4 }, (_, index) => value[index] ?? '')

  function update(index: number, digit: string) {
    const next = [...digits]
    next[index] = digit
    onChange(next.join(''))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== 'Backspace' || digits[index] || index === 0) return
    event.preventDefault()
    inputs.current[index - 1]?.focus()
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4 - index)
    if (!pasted) return
    const next = [...digits]
    for (const [offset, digit] of [...pasted].entries()) next[index + offset] = digit
    onChange(next.join(''))
    inputs.current[Math.min(index + pasted.length, 3)]?.focus()
  }

  return (
    <>
      <div className="organization-code">
        <label id="organization-code-label">Código</label>
        <div className="organization-code-inputs" role="group" aria-labelledby="organization-code-label">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(input) => { inputs.current[index] = input }}
              className="organization-code-digit"
              aria-label={`Dígito ${index + 1} do código`}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              onChange={(event) => {
                const digit = event.target.value.replace(/\D/g, '').slice(-1)
                update(index, digit)
                if (digit && index < 3) inputs.current[index + 1]?.focus()
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onPaste={(event) => handlePaste(event, index)}
            />
          ))}
        </div>
      </div>
      <span className="login-strength">Códigos de acesso são alterados a cada 20 minutos</span>
    </>
  )
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
  const [findingOrganization, setFindingOrganization] = useState(false)
  const [joinPreview, setJoinPreview] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinCodeError, setJoinCodeError] = useState(false)
  const text = copy[step]
  const isOrganizationSearch = step === 'org' && findingOrganization

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
      } else if (step === 'username') {
        const { error } = await authClient.updateUser({ username: name })
        if (error) throw error
      } else {
        await createProject(name)
      }
      onDone?.()
      setBusy(false)
    } catch {
      setBusy(false)
      setError(text.failed)
    }
  }

  function previewJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (joinCode.length !== 4) {
      setJoinCodeError(true)
      setJoinPreview(false)
      return
    }
    setJoinCodeError(false)
    setJoinPreview(true)
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
          <h1 id="onboarding-title">{isOrganizationSearch ? 'Encontrar organização' : text.title}</h1>
          {isOrganizationSearch ? (
            <p>Procurar por organização através de nome e código.</p>
          ) : (
            <>
              <p>{text.description}</p>
              {step === 'project' && <p>Projetos podem ser partilhados dentro de uma equipa ou para alguma entidade externas.</p>}
            </>
          )}
        </header>
        {isOrganizationSearch ? (
          <form onSubmit={previewJoin}>
            <div className="login-field">
              <label htmlFor="organization-name">Nome da organização</label>
              <input id="organization-name" name="organization-name" type="text" maxLength={80} autoComplete="off" autoFocus required />
            </div>
            <OrganizationCodeInput value={joinCode} onChange={setJoinCode} />
            {joinCodeError && (
              <p className="login-field-error" role="alert">Introduz os quatro dígitos do código.</p>
            )}
            {joinPreview && (
              <p className="login-notice" role="status">Pré-visualização: a entrada numa organização será ligada mais tarde.</p>
            )}
            <div className="login-buttons">
              <button className="login-button" type="submit">Encontrar organização</button>
            </div>
          </form>
        ) : (
          <form onSubmit={submit}>
            <div className="login-field">
              <label htmlFor="name">{text.label}</label>
              <input
                key={step}
                id="name"
                name="name"
                type="text"
                maxLength={80}
                autoComplete={step === 'username' ? 'username' : 'off'}
                autoFocus
                required
              />
            </div>
            {step === 'project' && (
              <fieldset className="project-visibility">
                <legend>Visibilidade</legend>
                <p>Define quem pode aceder a este projeto.</p>
                <div className="project-visibility-options">
                  <label className="project-visibility-option">
                    <input type="radio" name="visibility" value="private" defaultChecked />
                    <span><strong>Privado</strong><small>Apenas o proprietário do projeto.</small></span>
                  </label>
                  <label className="project-visibility-option">
                    <input type="radio" name="visibility" value="public" />
                    <span><strong>Público</strong><small>Disponível dentro da organização.</small></span>
                  </label>
                </div>
              </fieldset>
            )}
            {error && (
              <p className="login-notice login-error" role="alert">{error}</p>
            )}
            <div className="login-buttons">
              <button className="login-button" type="submit" disabled={busy}>
                {busy ? 'A criar…' : text.submit}
              </button>
            </div>
          </form>
        )}
        {step === 'org' && (
          <p className="login-switch">
            {isOrganizationSearch ? 'Criar uma organização? ' : 'À procura de uma organização? '}
            <button
              className="login-link"
              type="button"
              onClick={() => {
                setFindingOrganization((finding) => !finding)
                setJoinPreview(false)
                setJoinCode('')
                setJoinCodeError(false)
              }}
            >
              {isOrganizationSearch ? 'Nova organização' : 'Encontrar'}
            </button>
          </p>
        )}
      </section>
    </main>
  )
}
