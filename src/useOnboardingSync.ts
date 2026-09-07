import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { authClient, type AuthSession } from './auth'
import { inviteToken, onboardingRequest, SyncError, type Bootstrap } from './onboardingSync'
import type { Draft } from './Onboarding'

type Setup = { operationId: string; revision: number; name: string; slug: string; profileName: string; profileImage?: string; completed: boolean; changelog: boolean; daily: boolean }
type Invitation = { token: string; email: string | null }
type Record = { draft: Draft; revision: number; pending?: Setup; invitations: Invitation[]; link?: string }
type Props = { preview: boolean; session: AuthSession | null; draft: Draft; setDraft: Dispatch<SetStateAction<Draft>>; setNotice: (message: string) => void; setError: (message: string) => void; onReady?: (state: Bootstrap) => void }
const prefix = 'fontes:onboarding:v1:'

export function useOnboardingSync(props: Props) {
  const current = useRef(props)
  current.current = props
  const record = useRef<Record>({ draft: props.draft, revision: 0, invitations: [] })
  const restored = useRef(false)
  if (!restored.current && !props.preview) {
    restored.current = true
    try {
      const pending = JSON.parse(sessionStorage.getItem(prefix + 'pending') || 'null')
      if (pending?.draft?.email === props.draft.email && Array.isArray(pending.invitations) && Number.isSafeInteger(pending.revision)) record.current = { ...pending, draft: props.draft }
    } catch { /* No pending pre-authentication draft. */ }
  }
  const owner = useRef<string | null>(null)
  const recordOwner = useRef<string | null>(null)
  const generation = useRef(0)
  const state = useRef<Bootstrap | null>(null)
  const running = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const attempts = useRef(0)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const initialized = useRef(false)
  const verifyRunning = useRef(false)

  function persist() {
    if (!owner.current) {
      try { sessionStorage.setItem(prefix + 'pending', JSON.stringify(record.current)) } catch { /* optional storage */ }
      return
    }
    try { localStorage.setItem(prefix + owner.current, JSON.stringify(record.current)) }
    catch { current.current.setError('O armazenamento local está indisponível. Mantém esta página aberta até terminar.') }
  }
  function schedule() {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { void drain() }, Math.min(30000, 1000 * 2 ** Math.min(attempts.current++, 5)))
  }
  async function drain() {
    if (running.current || !owner.current || !state.current || props.preview) return
    const epoch = generation.current
    running.current = true
    setFailed(false)
    try {
      while (epoch === generation.current) {
        const snapshot = record.current.pending
        if (snapshot) {
          if (!snapshot.revision) { snapshot.revision = record.current.revision + 1; persist() }
          const result = await onboardingRequest<Bootstrap>('', snapshot)
          if (epoch !== generation.current) return
          state.current = result
          record.current.revision = result.revision
          if (record.current.pending?.operationId === snapshot.operationId) record.current.pending = undefined
          persist()
          continue
        }
        const invitation = record.current.invitations[0]
        if (!invitation || !state.current.organization) break
        await onboardingRequest('/invite', { ...invitation, organizationId: state.current.organization.id })
        if (epoch !== generation.current) return
        record.current.invitations = record.current.invitations.filter(item => item.token !== invitation.token)
        persist()
      }
      if (epoch !== generation.current) return
      attempts.current = 0
      // Nothing is left to save: the workspace opens itself, there is no closing screen to click through.
      if (state.current?.completed && state.current.project && !record.current.pending && !record.current.invitations.length) current.current.onReady?.(state.current)
      current.current.setError('')
    } catch (error) {
      if (epoch !== generation.current) return
      setFailed(true)
      if (error instanceof SyncError && error.status < 500 && error.status !== 429) {
        current.current.setError(error.message)
        if (error.step === 'workspace') current.current.setDraft(d => ({ ...d, step: 'workspace' }))
        if (error.status === 401) current.current.setDraft(d => ({ ...d, step: 'email' }))
      } else {
        current.current.setError('A ligação foi interrompida. Vamos tentar guardar novamente; o teu progresso está neste dispositivo.')
        schedule()
      }
    } finally {
      running.current = false
      if (epoch !== generation.current && owner.current) void drain()
    }
  }

  useEffect(() => {
    if (props.preview) return
    record.current.draft = props.draft
    persist()
  }, [props.draft, props.preview])

  useEffect(() => {
    if (props.preview || !props.session) return
    const session = props.session
    const epoch = ++generation.current
    try { sessionStorage.removeItem(prefix + 'pending') } catch { /* optional storage */ }
    owner.current = session.user.id
    if (recordOwner.current && recordOwner.current !== session.user.id) record.current = { draft: current.current.draft, revision: 0, invitations: [] }
    recordOwner.current = session.user.id
    initialized.current = false
    let saved: Record | null = null
    try {
      const value = JSON.parse(localStorage.getItem(prefix + session.user.id) || 'null')
      // A draft saved on the closing screen that no longer exists starts from the server state instead.
      if (value?.draft?.email === session.user.email && value.draft.step !== 'done' && Array.isArray(value.invitations) && Number.isSafeInteger(value.revision)) saved = value
    } catch { /* Start from server state if the local copy is invalid. */ }
    if (saved) { record.current = saved; current.current.setDraft(saved.draft) }
    else {
      if (current.current.draft.email && current.current.draft.email !== session.user.email) record.current = { draft: current.current.draft, revision: 0, invitations: [] }
      const draft = { ...current.current.draft, email: session.user.email, profile: current.current.draft.profile || session.user.name }
      record.current.draft = draft
      current.current.setDraft(draft)
    }
    const load = async () => {
      try {
        const invite = new URL(location.href).searchParams.get('invite')
        const result = await onboardingRequest<Bootstrap>(invite ? '/join' : '', invite ? { token: invite } : undefined)
        if (epoch !== generation.current) return
        if (invite) { const url = new URL(location.href); url.searchParams.delete('invite'); history.replaceState(null, '', url) }
        state.current = result
        record.current.revision = Math.max(record.current.revision, result.revision)
        initialized.current = true
        if (result.completed && result.project && !record.current.pending && !record.current.invitations.length) {
          current.current.onReady?.(result)
          return
        }
        current.current.setDraft(d => ({ ...d, step: ['start', 'email', 'code'].includes(d.step) ? (invite ? 'profile' : 'workspace') : d.step,
          name: d.name || result.organization?.name || '', slug: d.slug || result.organization?.slug || '',
          profile: d.profile || result.profile.name, changelog: saved ? d.changelog : result.changelog, daily: saved ? d.daily : result.daily }))
        void drain()
      } catch (error) {
        if (epoch !== generation.current) return
        setFailed(true)
        current.current.setError(error instanceof SyncError ? error.message : 'Não foi possível carregar o ambiente. Vamos tentar novamente.')
        if (!(error instanceof SyncError) || error.status >= 500) timer.current = setTimeout(() => { void load() }, 5000)
      }
    }
    void load()
    const online = () => { if (initialized.current) void drain(); else void load() }
    addEventListener('online', online)
    return () => { generation.current++; owner.current = null; state.current = null; clearTimeout(timer.current); removeEventListener('online', online) }
  }, [props.session?.user.id, props.preview])

  function save(completed = false) {
    const d = current.current.draft
    record.current.pending = { operationId: crypto.randomUUID(), revision: 0, name: d.name.trim(), slug: d.slug, profileName: d.profile.trim() || d.email.split('@')[0], profileImage: d.image || undefined, completed, changelog: d.changelog, daily: d.daily }
    persist()
    void drain()
  }
  function invite(addresses: string[]) {
    for (const email of new Set(addresses.map(value => value.toLowerCase()))) {
      if (!record.current.invitations.some(item => item.email === email)) record.current.invitations.push({ email, token: inviteToken() })
    }
    persist()
    void drain()
  }
  async function start() {
    if (busy || verifyRunning.current) return
    setBusy(true)
    current.current.setError('')
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email: current.current.draft.email.trim(), type: 'sign-in' })
      if (result.error) throw new Error(result.error.message || 'Não foi possível enviar o código.')
      current.current.setDraft(d => ({ ...d, step: 'code', email: d.email.trim(), profile: d.profile || d.email.split('@')[0].replace(/[._-]+/g, ' ') }))
    } catch (error) { current.current.setError(error instanceof Error ? error.message : 'Não foi possível enviar o código.') }
    finally { setBusy(false) }
  }
  function verify(code: string) {
    if (verifyRunning.current) return
    verifyRunning.current = true
    // A returning profile holds on the code screen until the session lands and the bootstrap routes it.
    current.current.setDraft(d => (d.returning ? d : { ...d, step: 'workspace' }))
    const email = current.current.draft.email
    void authClient.signIn.emailOtp({ email, otp: code }).then(result => {
      if (result.error) throw new Error('Código inválido ou expirado. Pede um novo código e tenta novamente.')
    }).catch(error => {
      current.current.setDraft(d => ({ ...d, step: 'code' }))
      current.current.setError(error instanceof Error ? error.message : 'Não foi possível confirmar o código.')
    }).finally(() => { verifyRunning.current = false })
  }
  async function google() {
    setBusy(true)
    try {
      const result = await authClient.signIn.social({ provider: 'google', callbackURL: location.origin + '/' + location.search })
      if (result.error) throw new Error(result.error.message)
    } catch { current.current.setError('Não foi possível continuar com Google. Tenta novamente.'); setBusy(false) }
  }
  async function changeEmail() {
    // Wait for verification before signing out so its late response cannot restore
    // an identity after the user has chosen a different email.
    if (verifyRunning.current) { current.current.setError('A confirmar o email. Tenta novamente dentro de instantes.'); return }
    if (current.current.session) {
      const result = await authClient.signOut()
      if (result.error) { current.current.setError('Não foi possível sair. Tenta novamente.'); return }
    }
    if (owner.current) { try { localStorage.removeItem(prefix + owner.current) } catch { /* optional storage */ } }
    generation.current++; owner.current = null; recordOwner.current = null; state.current = null
    record.current = { draft: current.current.draft, revision: 0, invitations: [] }
    current.current.setDraft(d => ({ ...d, step: 'email', returning: false, provider: 'email', email: '', name: '', slug: '', profile: '', invitations: '', changelog: false, daily: false }))
  }
  async function copyInvite() {
    const token = record.current.link || inviteToken()
    if (!record.current.link) {
      record.current.link = token
      record.current.invitations.push({ token, email: null })
      persist()
      void drain()
    }
    try { await navigator.clipboard.writeText(`${location.origin}/?invite=${token}`); current.current.setNotice('Link copiado. O convite fica ativo assim que for guardado.') }
    catch { current.current.setError('Não foi possível copiar o link. Verifica as permissões do navegador.') }
  }
  return { busy, failed, start, verify, google, save, invite, copyInvite, changeEmail,
    retry: () => { if (!initialized.current) location.reload(); else void drain() },
  }
}
