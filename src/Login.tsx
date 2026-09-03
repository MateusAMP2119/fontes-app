import { useEffect, useState, type FormEvent } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'
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
  if (normalized.includes('invalid login credentials')) return 'Email ou palavra-passe incorretos.'
  if (normalized.includes('email not confirmed')) return 'Confirma o teu email antes de entrares.'
  if (normalized.includes('password should be')) return 'A palavra-passe não cumpre os requisitos de segurança.'
  if (normalized.includes('rate limit')) return 'Foram feitas demasiadas tentativas. Volta a tentar dentro de alguns minutos.'
  return message || 'Não foi possível concluir a autenticação. Tenta novamente.'
}

function Spinner() {
  return (
    <svg className="login-spinner" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Login() {
  const callback = new URLSearchParams(location.hash.slice(1))
  const recoveryCallback = callback.get('type') === 'recovery'
  const callbackError = callback.get('error_description')
  const [mode, setMode] = useState<Mode>(recoveryCallback ? 'reset' : 'login')
  const [busy, setBusy] = useState(false)
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

  function go(next: Mode) {
    setMode(next)
    setNotice(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const password = String(form.get('password') ?? '')
    const redirectTo = `${location.origin}/login`
    let error: AuthError | null = null
    let message = ''
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
        break
      }
      case 'forgot':
        ;({ error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo }))
        message = 'Verifica o teu email: enviámos uma ligação de recuperação.'
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

  const text = copy[mode]

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
              <input id="email" name="email" type="email" placeholder="nome@exemplo.pt" autoComplete="email" required />
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
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>
          )}
          {notice && (
            <p className={notice.error ? 'login-notice login-error' : 'login-notice'} role="status">
              {notice.text}
            </p>
          )}
          <div className="login-buttons">
            <button className="login-button" type="submit" disabled={busy}>
              {busy && <Spinner />}
              {text.submit}
            </button>
          </div>
        </form>
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
