import OnboardingLayout from './OnboardingLayout'
import { FieldError, Icon, Toast } from './OnboardingFeedback'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { authClient } from './auth'
import './Onboarding.css'

// Continuous, so every keystroke moves the bar. The first third is the eight character
// minimum the input itself enforces: a full first bar is a password the form accepts.
function passwordStrength(value: string) {
  if (value.length < 8) return value.length / 8 / 3
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter(pattern => pattern.test(value)).length
  const beyond = Math.min(1, (value.length - 8) / 8) * 0.4 + (classes - 1) / 3 * 0.6
  return 1 / 3 + beyond * 2 / 3
}

export function PasswordField({ value, onChange, existing = false, name = existing ? 'oldPassword' : 'password', error, label = 'Palavra-passe', aside, meter = false }: { value: string; onChange: (value: string) => void; existing?: boolean; name?: string; error?: string; label?: string; aside?: ReactNode; meter?: boolean }) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  const strength = passwordStrength(value)
  const level = Math.floor(strength * 3)
  return <div className="ob-field ob-password-field"><div className="ob-password-head"><label htmlFor={id}>{label}</label>{aside}</div>
    <div className="ob-password-control">
      <input name={name} aria-invalid={error ? true : undefined} id={id} type={visible ? 'text' : 'password'} autoComplete={existing ? 'current-password' : 'new-password'} required minLength={existing ? 1 : 8} maxLength={128} value={value} onChange={e => onChange(e.target.value)} aria-describedby={[!existing && !error && id + '-hint', error && `ob-${name}-error`].filter(Boolean).join(' ') || undefined}/>
      <button className="ob-subtle" type="button" aria-label={visible ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
    </div>
    {meter && <div className="ob-strength" data-strength={level} role="meter" aria-label="Segurança da palavra-passe" aria-valuemin={0} aria-valuemax={3} aria-valuenow={level}>
      {/* An emptied bar is delayed from the right and a filling one from the left, so a
          cleared field drains one bar at a time instead of all three at once. */}
      {[0, 1, 2].map(part => {
        const fill = Math.min(1, Math.max(0, strength * 3 - part))
        return <span key={part}><i style={{ transform: `scaleX(${fill})`, transitionDelay: `${(fill > 0 ? part : 2 - part) * 70}ms` }}/></span>
      })}
    </div>}
    <FieldError id={`ob-${name}-error`} message={error} hint={!existing ? 'Entre 8 e 128 caracteres.' : undefined} hintId={id + '-hint'}/>
  </div>
}

export default function PasswordRecovery({ change = false }: { change?: boolean }) {
  const { data: session, isPending } = authClient.useSession()
  const [token, setToken] = useState(() => new URL(location.href).searchParams.get('token') || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(() => new URL(location.href).searchParams.has('error') ? 'Link inválido ou expirado. É necessário um novo pedido.' : '')
  const [notice, setNotice] = useState('')
  const [fieldError, setFieldError] = useState<{ name: string; text: string } | null>(null)
  const fieldMessage = (name: string) => fieldError?.name === name ? fieldError.text : undefined
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const invalid = e.currentTarget.querySelector<HTMLInputElement>(':invalid')
    if (invalid) {
      const messages: Record<string, string> = { email: 'Endereço de email inválido', oldPassword: 'Palavra-passe em falta', password: 'A palavra-passe deve ter entre 8 e 128 caracteres.' }
      setFieldError({ name: invalid.name, text: messages[invalid.name] || 'Campo por preencher' })
      invalid.focus({ preventScroll: true })
      return
    }
    setFieldError(null)
    setBusy(true); setError('')
    try {
      if (change) {
        const result = await authClient.$fetch('/set-password', { method: 'POST', body: { currentPassword: oldPassword, newPassword: password, revokeOtherSessions: true } })
        if (result.error) throw new Error('Não foi possível alterar a palavra-passe. A recuperação de acesso está disponível.')
        setDone(true); setNotice('Palavra-passe atualizada. As outras sessões foram terminadas.')
      } else if (token) {
        const result = await authClient.resetPassword({ newPassword: password, token })
        if (result.error) throw new Error('Link inválido ou expirado. É necessário um novo pedido.')
        setToken(''); setDone(true); setNotice('Palavra-passe atualizada. Início de sessão disponível.')
        const url = new URL(location.href); url.searchParams.delete('token'); url.searchParams.delete('error'); history.replaceState(null, '', url)
      } else {
        const redirect = new URL(location.href); redirect.pathname = '/reset-password'; redirect.searchParams.delete('token'); redirect.searchParams.delete('error')
        const result = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: redirect.href })
        if (result.error) throw new Error('Não foi possível processar o pedido. Nova tentativa disponível.')
        setNotice('Se existir uma conta associada a este email, será enviado um link de recuperação.')
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível concluir o pedido.') }
    finally { setBusy(false); setPassword(''); setOldPassword('') }
  }
  const login = new URL(location.href); login.pathname = '/login'; login.searchParams.delete('token'); login.searchParams.delete('error')
  async function signInAfterReset() {
    if (busy) return
    setBusy(true); setError('')
    try {
      // Resetting another account does not revoke the current browser session.
      // Confirm sign-out before visiting the ordinary authenticated login gate.
      const result = await authClient.signOut()
      if (result.error) throw new Error()
      location.assign(login.pathname + login.search)
    } catch {
      setError('Não foi possível terminar a sessão atual. Nova tentativa disponível.')
      setBusy(false)
    }
  }
  return <OnboardingLayout><section className="ob-panel ob-recovery">
    <header><h1>{change ? 'Alterar palavra-passe' : token ? 'Definir nova palavra-passe' : 'Recuperar acesso'}</h1></header>
    {change && !isPending && !session ? <a href={login.pathname + login.search}>Iniciar sessão</a> : !done && <form onSubmit={submit} noValidate onInput={event => { if ((event.target as HTMLInputElement).name === fieldError?.name) setFieldError(null) }}>
      {change && <PasswordField existing error={fieldMessage('oldPassword')} value={oldPassword} onChange={setOldPassword} />}
      {token || change ? <PasswordField label={change ? 'Nova palavra-passe' : 'Palavra-passe'} error={fieldMessage('password')} value={password} onChange={setPassword} /> : <label className="ob-field ob-visible-label"><span>Email</span><input name="email" aria-label="Email" aria-invalid={fieldMessage('email') ? true : undefined} aria-describedby={fieldMessage('email') ? 'ob-email-error' : undefined} type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} /><FieldError id="ob-email-error" message={fieldMessage('email')}/></label>}
      <button className="ob-button ob-primary ob-wide" disabled={busy || (change && isPending)}>{token || change ? 'Guardar palavra-passe' : 'Enviar link de recuperação'}</button>
    </form>}
    {notice && <p role="status">{notice}</p>}
    {token && <button className="ob-subtle" onClick={() => { setToken(''); setError(''); const url = new URL(location.href); url.searchParams.delete('token'); history.replaceState(null, '', url) }}>Solicitar novo link</button>}
    {change && <a className="ob-subtle ob-password-recovery" href="/reset-password">Recuperar acesso<Icon kind="arrow"/></a>}
    <p>{done && !change
      ? <button type="button" className="ob-subtle" disabled={busy} onClick={() => void signInAfterReset()}>Iniciar sessão</button>
      : <a href={done && change ? '/' : login.pathname + login.search}>{done && change ? 'Voltar ao ambiente' : 'Iniciar sessão'}</a>}</p>
  </section>{error && <div className="ob-toasts"><Toast message={error} error onDismiss={() => setError('')}/></div>}</OnboardingLayout>
}
