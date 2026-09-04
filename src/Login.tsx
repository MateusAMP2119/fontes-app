import { useEffect, useState, type FormEvent } from 'react'
import { isAuthApiError, type AuthError } from '@supabase/supabase-js'
import { authCallbackError, authCallbackType, supabase } from './supabase'
import { navigate } from './navigate'
import './Login.css'

type Mode = 'login' | 'signup' | 'forgot' | 'reset'

const copy: Record<Mode, { title: string; description: string; submit: string }> = {
  login: {
    title: 'Entrar na tua conta',
    description: 'Introduz o teu email para entrares na tua conta.',
    submit: 'Entrar',
  },
  signup: {
    title: 'Criar conta',
    description: 'Introduz o teu email e uma palavra-passe para criares a conta.',
    submit: 'Criar conta',
  },
  forgot: {
    title: 'Recuperar palavra-passe',
    description: 'Enviamos-te uma ligação para definires uma nova palavra-passe.',
    submit: 'Enviar ligação',
  },
  reset: {
    title: 'Nova palavra-passe',
    description: 'Escolhe a nova palavra-passe da tua conta.',
    submit: 'Guardar',
  },
}

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const normalized = message.toLowerCase()
  const code = isAuthApiError(error) ? error.code : undefined
  if (code === 'unexpected_failure' && normalized.includes('sending')) {
    return 'O serviço de email está temporariamente indisponível. Tenta novamente dentro de alguns minutos.'
  }
  if (code === 'over_email_send_rate_limit') {
    return 'Já foi enviado um email há pouco. Aguarda alguns minutos antes de pedires outro.'
  }
  if (code === 'over_request_rate_limit') {
    return 'Foram feitos demasiados pedidos a partir deste dispositivo. Aguarda alguns minutos e tenta novamente.'
  }
  if (normalized.includes('invalid login credentials')) return 'Email ou palavra-passe incorretos.'
  if (normalized.includes('email not confirmed')) return 'Confirma o teu email antes de entrares.'
  if (normalized.includes('expired') || normalized.includes('invalid link')) return 'Esta ligação é inválida ou expirou. Pede uma nova.'
  if (normalized.includes('password should be')) return 'A palavra-passe não cumpre os requisitos de segurança.'
  if (normalized.includes('rate limit')) return 'Foram feitas demasiadas tentativas. Volta a tentar dentro de alguns minutos.'
  if (normalized.includes('load failed') || normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'Não foi possível ligar ao serviço. Verifica a ligação e tenta novamente.'
  }
  return message || 'Não foi possível concluir a autenticação. Tenta novamente.'
}

function Spinner() {
  return (
    <svg className="login-spinner" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.74 2.98-4.32 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
    </svg>
  )
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {hidden && <path d="m4 4 16 16" />}
    </svg>
  )
}

function PasswordInput({
  id,
  name,
  label,
  value,
  autoComplete,
  creation = false,
  onChange,
}: {
  id: string
  name: string
  label: string
  value: string
  autoComplete: 'current-password' | 'new-password'
  creation?: boolean
  onChange: (value: string) => void
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="login-password-wrap">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        minLength={creation ? 8 : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      <button
        className="login-password-toggle"
        type="button"
        aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
        aria-pressed={visible}
        onClick={() => setVisible((shown) => !shown)}
      >
        <EyeIcon hidden={visible} />
      </button>
    </div>
  )
}

function passwordStrength(password: string) {
  if (!password) return { score: 0, label: 'Usa pelo menos 8 caracteres.' }
  const score = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^\w\s]/.test(password),
  ].filter(Boolean).length
  return { score, label: ['Muito fraca', 'Muito fraca', 'Fraca', 'Razoável', 'Forte'][score] }
}

export default function Login() {
  const recoveryCallback = authCallbackType === 'recovery'
  const callbackError = authCallbackError
  const [mode, setMode] = useState<Mode>(recoveryCallback ? 'reset' : 'login')
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(
    callbackError ? { text: friendly(callbackError), error: true } : null,
  )

  useEffect(() => {
    if (callbackError) history.replaceState(null, '', `${location.pathname}${location.search}`)
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setMode('reset')
      else if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session && !recoveryCallback && !callbackError) {
        navigate('/')
      }
    })
    return () => data.subscription.unsubscribe()
  }, [callbackError, recoveryCallback])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  function go(next: Mode) {
    setMode(next)
    setNotice(null)
    setPassword('')
    setConfirmation('')
    setCooldown(0)
    setSubmitted(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const redirectTo = `${location.origin}/login`
    let error: AuthError | null = null
    let message = ''
    if ((mode === 'signup' || mode === 'reset') && password !== confirmation) {
      setNotice({ text: 'As palavras-passe não coincidem.', error: true })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      switch (mode) {
      // On success the SIGNED_IN listener above has already navigated away, so only errors are handled here.
      case 'login':
        ;({ error } = await supabase.auth.signInWithPassword({ email, password }))
        if (!error) return
        break
      case 'signup': {
        const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
        error = result.error
        if (result.data.session) return
        message = 'Verifica o teu email para confirmares a conta.'
        if (!error) setSubmitted(true)
        break
      }
      case 'forgot':
        ;({ error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo }))
        message = 'Verifica o teu email: enviámos uma ligação de recuperação.'
        if (!error) setCooldown(60)
        break
      case 'reset':
        ;({ error } = await supabase.auth.updateUser({ password }))
        if (!error) return navigate('/')
        break
      }
    } catch (error) {
      setBusy(false)
      setNotice({ text: friendly(error), error: true })
      return
    }
    setBusy(false)
    setNotice(error ? { text: friendly(error), error: true } : { text: message })
  }

  async function continueWithGoogle() {
    setBusy(true)
    setNotice(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}/` },
      })
      if (error) throw error
    } catch (error) {
      setBusy(false)
      setNotice({ text: friendly(error), error: true })
    }
  }

  const text = copy[mode]
  const creatingPassword = mode === 'signup' || mode === 'reset'
  const strength = passwordStrength(password)

  return (
    <main className="login-page">
      <div className="make-background" aria-hidden="true">
        <div className="make-purple-blob">
          <div className="make-purple-blob-primary" />
          <div className="make-purple-blob-secondary" />
        </div>
        <div className="make-background-grid" />
      </div>
      <a
        className="make-brand login-brand"
        href="/"
        aria-label="Fontes, página inicial"
        onClick={(event) => {
          event.preventDefault()
          navigate('/')
        }}
      >
        <img className="make-mark" src="/mark.png" alt="" width={30} height={30} />
        <span aria-hidden="true">Fontes</span>
      </a>
      <section className="login-card" aria-labelledby="login-title">
        <header>
          <h1 id="login-title">{text.title}</h1>
          <p>{text.description}</p>
        </header>
        <form onSubmit={submit}>
          {mode !== 'reset' && (
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nome@exemplo.pt"
                autoComplete={mode === 'login' ? 'username' : 'email'}
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                key={`email-${mode}`}
                required
              />
            </div>
          )}
          {mode !== 'forgot' && (
            <div className="login-field">
              <div className="login-field-row">
                <label htmlFor="password">Palavra-passe</label>
                {mode === 'login' && (
                  <button className="login-link" type="button" onClick={() => go('forgot')}>
                    Esqueceste a palavra-passe?
                  </button>
                )}
              </div>
              <PasswordInput
                key={`password-${mode}`}
                id="password"
                name="password"
                label="Palavra-passe"
                value={password}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                creation={creatingPassword}
                onChange={setPassword}
              />
            </div>
          )}
          {creatingPassword && (
            <>
              <div className="login-strength" aria-live="polite">
                <div className="login-strength-bars" aria-hidden="true">
                  {[1, 2, 3, 4].map((step) => (
                    <span key={step} className={step <= strength.score ? `is-filled strength-${strength.score}` : ''} />
                  ))}
                </div>
                <span>{strength.label}</span>
              </div>
              <div className="login-field">
                <label htmlFor="password-confirmation">Confirmar palavra-passe</label>
                <PasswordInput
                  key={`confirmation-${mode}`}
                  id="password-confirmation"
                  name="password-confirmation"
                  label="Confirmação da palavra-passe"
                  value={confirmation}
                  autoComplete="new-password"
                  creation
                  onChange={setConfirmation}
                />
                {confirmation && password !== confirmation && (
                  <span className="login-field-error" role="alert">As palavras-passe não coincidem.</span>
                )}
              </div>
            </>
          )}
          {notice && (
            <p className={notice.error ? 'login-notice login-error' : 'login-notice'} role="status">
              {notice.text}
            </p>
          )}
          <div className="login-buttons">
            <button className="login-button" type="submit" disabled={busy || submitted || cooldown > 0}>
              {busy && <Spinner />}
              {submitted ? 'Email enviado' : cooldown > 0 ? `Enviar novamente (${cooldown}s)` : text.submit}
            </button>
          </div>
        </form>
        {(mode === 'login' || mode === 'signup') && (
          <div className="login-oauth">
            <div className="login-divider"><span>ou</span></div>
            <button className="login-button login-outline" type="button" disabled={busy} onClick={continueWithGoogle}>
              <GoogleIcon />
              Continuar com Google
            </button>
          </div>
        )}
        {mode !== 'reset' && (
          <p className="login-switch">
            {mode === 'login' ? 'Não tens conta? ' : 'Já tens conta? '}
            <button className="login-link" type="button" onClick={() => go(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        )}
      </section>
    </main>
  )
}
