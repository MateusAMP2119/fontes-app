import OnboardingLayout from './OnboardingLayout'
import { useId, useState, type FormEvent } from 'react'
import { authClient } from './auth'
import './Onboarding.css'

export function PasswordField({ value, onChange, existing = false }: { value: string; onChange: (value: string) => void; existing?: boolean }) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  return <div className="ob-field ob-password-field"><label htmlFor={id}>{existing ? 'Palavra-passe atual' : 'Palavra-passe'}</label>
    <div className="ob-password-control">
      <input id={id} type={visible ? 'text' : 'password'} autoComplete={existing ? 'current-password' : 'new-password'} required minLength={existing ? 1 : 8} maxLength={128} value={value} onChange={e => onChange(e.target.value)} aria-describedby={!existing ? id + '-hint' : undefined}/>
      <button className="ob-subtle" type="button" aria-label={visible ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
    </div>
    {!existing && <small id={id + '-hint'}>Entre 8 e 128 caracteres.</small>}
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
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      if (change) {
        const result = await authClient.changePassword({ currentPassword: oldPassword, newPassword: password, revokeOtherSessions: true })
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
  return <OnboardingLayout><section className="ob-panel ob-recovery">
    <header><h1>{change ? 'Alterar palavra-passe' : token ? 'Definir nova palavra-passe' : 'Recuperar acesso'}</h1></header>
    {change && !isPending && !session ? <a href={login.pathname + login.search}>Iniciar sessão</a> : !done && <form onSubmit={submit}>
      {change && <PasswordField existing value={oldPassword} onChange={setOldPassword} />}
      {token || change ? <PasswordField value={password} onChange={setPassword} /> : <label className="ob-field ob-visible-label"><span>Email</span><input type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} /></label>}
      <button className="ob-button ob-primary ob-wide" disabled={busy || (change && isPending)}>{token || change ? 'Guardar palavra-passe' : 'Enviar link de recuperação'}</button>
    </form>}
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    {token && <button className="ob-subtle" onClick={() => { setToken(''); setError(''); const url = new URL(location.href); url.searchParams.delete('token'); history.replaceState(null, '', url) }}>Solicitar novo link</button>}
    {change && <a href="/reset-password">Recuperar acesso</a>}
    <p><a href={done && change ? '/' : login.pathname + login.search}>{done && change ? 'Voltar ao ambiente' : 'Iniciar sessão'}</a></p>
  </section></OnboardingLayout>
}
