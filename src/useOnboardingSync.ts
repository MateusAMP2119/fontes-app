import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { authClient, type AuthSession } from './auth'
import { inviteToken, onboardingRequest, SyncError, type Bootstrap } from './onboardingSync'
import { fresh, saved, steps, type Draft, type Step } from './onboardingDraft'

type Setup = { organizationId?: string; operationId: string; revision: number; name: string; slug: string; profileName: string; profileImage?: string; completed: boolean; automaticSlug?: boolean; workspace?: boolean; changelog: boolean; daily: boolean }
type Invitation = { organizationId?: string; token: string; email: string; status?: 'sent' | 'failed'; error?: string }
type Record = { draft: Draft; revision: number; pending?: Setup; invitations: Invitation[]; link?: string }
type Props = { preview: boolean; session: AuthSession | null; draft: Draft; setDraft: Dispatch<SetStateAction<Draft>>; setNotice: (message: string) => void; setError: (message: string) => void; onReady?: (state: Bootstrap) => void; onBlocked?: () => void }
const prefix = 'fontes:onboarding:v1:'
const transient = (e: unknown) => !(e instanceof SyncError) || e.status >= 500 || e.status === 429

export function useOnboardingSync(props: Props) {
  const current = useRef(props)
  current.current = props
  const record = useRef<Record>({ draft: props.draft, revision: 0, invitations: [] })
  const owner = useRef<string | null>(null)
  const pageHidden = useRef(false)
  const previousUser = useRef<string | undefined>(undefined)
  const generation = useRef(0)
  const state = useRef<Bootstrap | null>(null)
  const running = useRef(false)
  const authRunning = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const attempts = useRef(0)
  const reload = useRef<() => Promise<void>>(async () => {})
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null)
  const [invitation, setInvitation] = useState<{ name: string; role: string } | null>(null)
  const [invitationErrors, setInvitationErrors] = useState<Invitation[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const slugRetries = useRef(0)

  useEffect(() => {
    const leaving = () => { pageHidden.current = true; clearTimeout(timer.current) }
    const returning = (event: PageTransitionEvent) => { pageHidden.current = false; if (event.persisted && owner.current) void reload.current() }
    addEventListener('beforeunload', leaving); addEventListener('pagehide', leaving); addEventListener('pageshow', returning)
    return () => { removeEventListener('beforeunload', leaving); removeEventListener('pagehide', leaving); removeEventListener('pageshow', returning) }
  }, [])

  function persist() {
    try {
      if (owner.current) localStorage.setItem(prefix + owner.current, JSON.stringify(record.current))
      else sessionStorage.setItem(prefix + 'pending', JSON.stringify({ draft: record.current.draft }))
    } catch { current.current.setError('Armazenamento local indisponível. Progresso apenas nesta página.') }
  }
  function updateInvitations() {
    setInvitationErrors(record.current.invitations.filter(i => i.status === 'failed'))
    persist()
  }
  function receive(result: Bootstrap) {
    state.current = result
    setBootstrap(result)
    record.current.revision = result.revision
  }
  function openIfReady() {
    const s = state.current
    if (s?.completed && s.project && s.organization && !s.passwordRequired && !s.accessLost && !record.current.pending && !new URL(location.href).searchParams.has('invite')) current.current.onReady?.(s)
  }
  function schedule(error?: unknown) {
    clearTimeout(timer.current)
    const delay = error instanceof SyncError && error.retryAfter ? error.retryAfter : Math.min(30000, 1000 * 2 ** Math.min(attempts.current++, 5))
    timer.current = setTimeout(() => { void drain() }, delay)
  }
  async function drain() {
    if (running.current || !owner.current || !state.current || state.current.passwordRequired || props.preview) return
    const epoch = generation.current
    running.current = true
    setFailed(false)
    if (record.current.pending) setSyncStatus('saving')
    try {
      while (epoch === generation.current) {
        const snapshot = record.current.pending
        if (snapshot) {
          if (!snapshot.revision) { snapshot.revision = record.current.revision + 1; persist() }
          const result = await onboardingRequest<Bootstrap>('', snapshot)
          if (epoch !== generation.current) return
          receive(result)
          if (record.current.pending?.operationId === snapshot.operationId) record.current.pending = undefined
          persist()
          if (snapshot.workspace) {
            setWorkspaceBusy(false)
            // Profile drafting may already be underway. Never navigate on a late save.
          }
          openIfReady()
          continue
        }
        openIfReady()
        const item = record.current.invitations.find(i => !i.status)
        if (!item || !state.current.organization) break
        try {
          await onboardingRequest('/invite', { token: item.token, email: item.email, organizationId: item.organizationId })
          if (epoch !== generation.current) return
          item.status = 'sent'
        } catch (error) {
          if (epoch !== generation.current) return
          // Optional delivery failures cannot block other recipients or completion.
          item.status = 'failed'
          item.error = error instanceof SyncError ? error.message : 'Envio por confirmar. Nova tentativa disponível.'
        }
        updateInvitations()
      }
      attempts.current = 0
      if (!record.current.pending) setSyncStatus('saved')
      current.current.setError('')
    } catch (error) {
      if (epoch !== generation.current) return
      const pending = record.current.pending
      if (error instanceof SyncError && error.status === 409 && error.step === 'workspace' && pending?.automaticSlug && slugRetries.current++ < 3) {
        pending.slug = `${pending.slug.slice(0, 41)}-${crypto.randomUUID().slice(0, 6)}`
        current.current.setDraft(d => ({ ...d, slug: pending.slug }))
        persist(); schedule(); return
      }
      setFailed(true)
      setSyncStatus('failed')
      current.current.setError(error instanceof SyncError ? error.message : 'Ligação interrompida. Nova tentativa em instantes.')
      if (transient(error)) schedule(error)
      else {
        setWorkspaceBusy(false)
        if (error instanceof SyncError && error.conflict) {
          record.current.pending = undefined
          persist()
          await reload.current()
          current.current.setNotice('Configuração recuperada do servidor após alterações noutra janela.')
        } else if (error instanceof SyncError && error.status === 401) {
          await changeEmail()
        } else if (error instanceof SyncError && steps.includes(error.step as Step)) {
          current.current.setDraft(d => ({ ...d, step: error.step as Step }))
        }
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
    if (props.preview) return
    if (!props.session) {
      if (previousUser.current) {
        previousUser.current = undefined
        record.current = { draft: { ...fresh }, revision: 0, invitations: [] }
        setBootstrap(null); setLoading(false); setFailed(false); setWorkspaceBusy(false); setSyncStatus('idle')
        setInvitation(null); setInvitationErrors([]); setInviteLink('')
        current.current.setDraft({ ...fresh }); current.current.setNotice(''); current.current.setError('')
        try { sessionStorage.removeItem(prefix + 'pending') } catch { /* optional storage */ }
      }
      return
    }
    previousUser.current = props.session.user.id
    const session = props.session
    const epoch = ++generation.current
    owner.current = session.user.id
    state.current = null
    setBootstrap(null)
    setLoading(true)
    try { sessionStorage.removeItem(prefix + 'pending') } catch { /* optional storage */ }
    const initial = current.current.draft.email.toLowerCase() === session.user.email.toLowerCase() ? current.current.draft : { ...fresh }
    record.current = { draft: { ...initial, email: session.user.email, profile: initial.profile || session.user.name || session.user.email.split('@')[0] }, revision: 0, invitations: [] }
    let restored = false
    try {
      const value = JSON.parse(localStorage.getItem(prefix + session.user.id) || 'null')
      const draft = saved(value?.draft)
      if (draft && draft.email === session.user.email && Number.isSafeInteger(value.revision) && Array.isArray(value.invitations)) {
        restored = true
        // Only accept known shapes. Legacy local completion is never authoritative.
        record.current = { draft, revision: value.revision, invitations: value.invitations.filter((i: Invitation) => typeof i.email === 'string' && /^[a-f0-9]{64}$/.test(i.token)),
          pending: value.pending && typeof value.pending.operationId === 'string' && Number.isSafeInteger(value.pending.revision) && typeof value.pending.name === 'string' && typeof value.pending.profileName === 'string' ? value.pending : undefined }
      }
    } catch { /* Recover from server when local data is corrupt. */ }
    const load = async () => {
      setLoading(true)
      try {
        const result = await onboardingRequest<Bootstrap>()
        if (epoch !== generation.current) return
        const sameRevision = restored && record.current.revision === result.revision
        receive(result)
        setFailed(false)
        const pending = record.current.pending
        if (pending?.revision && result.revision >= pending.revision) {
          record.current.pending = undefined
          if (result.operationId !== pending.operationId) current.current.setNotice('Configuração recuperada do servidor após alterações noutra janela.')
        }
        const d = record.current.draft
        const keep = sameRevision || !!record.current.pending || (!result.organization && !!d.name)
        const token = new URL(location.href).searchParams.get('invite')
        let step: Step = result.passwordRequired ? 'password' : token ? 'join' : result.organization ? 'profile' : 'workspace'
        if (!result.passwordRequired && !token && result.organization && ['profile', 'invites', 'updates'].includes(d.step)) step = d.step
        if (!result.passwordRequired && !token && record.current.pending?.workspace && d.step === 'profile') step = 'profile'
        if (step === 'invites' && result.canInvite === false) step = 'updates'
        current.current.setDraft({ ...d, step, email: session.user.email,
          name: keep ? d.name : result.organization?.name || d.name,
          slug: keep ? d.slug : result.organization?.slug || d.slug,
          profile: (keep ? d.profile : result.profile.name || d.profile) || session.user.name || session.user.email.split('@')[0],
          image: keep ? d.image : result.profile.image || '',
          changelog: keep ? d.changelog : result.changelog, daily: keep ? d.daily : result.daily })
        setWorkspaceBusy(!!record.current.pending?.workspace)
        for (const item of record.current.invitations) if (!item.organizationId && item.status !== 'sent') { item.status = 'failed'; item.error = 'Convite antigo sem ambiente confirmado. É necessário remover e criar novamente.' }
        updateInvitations()
        if (result.passwordRequired || result.accessLost) current.current.onBlocked?.()
        if (result.accessLost) throw new SyncError(403, 'O acesso ao ambiente deixou de estar disponível.')
        if (token && !result.passwordRequired) {
          setInvitation(null)
          const detail = await onboardingRequest<{ name: string; role: string }>('/invitation', { token })
          if (epoch !== generation.current) return
          setInvitation(detail)
        } else {
          openIfReady()
          if (!result.passwordRequired) void drain()
        }
      } catch (error) {
        if (epoch !== generation.current) return
        setFailed(true)
        current.current.onBlocked?.()
        current.current.setError(error instanceof SyncError ? error.message : 'Ambiente indisponível. Nova tentativa em instantes.')
        if (transient(error)) timer.current = setTimeout(() => { void load() }, error instanceof SyncError && error.retryAfter ? error.retryAfter : 5000)
      } finally { if (epoch === generation.current) setLoading(false) }
    }
    reload.current = load
    void load()
    const online = () => { if (record.current.pending) void drain(); else void load() }
    const storage = (e: StorageEvent) => { if (e.key === prefix + session.user.id && !running.current) void load() }
    addEventListener('online', online)
    addEventListener('storage', storage)
    return () => { generation.current++; owner.current = null; state.current = null; clearTimeout(timer.current); removeEventListener('online', online); removeEventListener('storage', storage) }
  }, [props.session?.user.id, props.session?.session.id, props.preview])

  function save(completed = false, workspace = false) {
    if (!state.current || state.current.passwordRequired || state.current.accessLost || (workspace && workspaceBusy)) return
    if (completed && (!state.current.project || !state.current.organization)) { current.current.setError('Ambiente de trabalho por confirmar.'); return }
    const d = current.current.draft
    record.current.pending = { organizationId: state.current.organization?.id, operationId: crypto.randomUUID(), revision: 0, name: d.name.trim(), slug: d.slug,
      profileName: d.profile.trim(), profileImage: d.image, completed, automaticSlug: workspace && !d.slugEdited, workspace, changelog: d.changelog, daily: d.daily }
    record.current.draft = d
    setSyncStatus('saving')
    if (workspace) { slugRetries.current = 0; setWorkspaceBusy(true); current.current.setDraft(d => ({ ...d, step: 'profile' })) }
    persist()
    void drain()
  }
  // Coalesce valid edits after typing pauses. Credentials never enter this effect.
  useEffect(() => {
    if (props.preview || !['profile', 'updates'].includes(props.draft.step) || !bootstrap?.organization || workspaceBusy || bootstrap.passwordRequired) return
    const d = props.draft
    if (!d.profile.trim() || d.profile.length > 80 || !d.name.trim() || !/^[a-z0-9][a-z0-9-]{2,47}$/.test(d.slug)) return
    const server = state.current
    if (!server || (d.profile.trim() === server.profile.name && d.image === (server.profile.image || '') && d.changelog === server.changelog && d.daily === server.daily)) return
    setSyncStatus('saving')
    const timeout = setTimeout(() => {
      const s = state.current
      if (!s || s.completed || record.current.pending?.completed) return
      const latest = current.current.draft
      if (latest.profile.trim() === s.profile.name && latest.image === (s.profile.image || '') && latest.changelog === s.changelog && latest.daily === s.daily) return
      save()
    }, 500)
    return () => clearTimeout(timeout)
  }, [props.preview, props.draft.step, props.draft.profile, props.draft.image, props.draft.name, props.draft.slug, props.draft.changelog, props.draft.daily, bootstrap?.organization?.id, bootstrap?.passwordRequired, workspaceBusy])

  function invite(addresses: string[]) {
    if (!state.current?.organization || state.current.canInvite === false) return
    for (const email of new Set(addresses.map(v => v.trim().toLowerCase()))) {
      if (email !== current.current.draft.email.toLowerCase() && !record.current.invitations.some(i => i.email === email)) record.current.invitations.push({ email, token: inviteToken(), organizationId: state.current.organization.id })
    }
    updateInvitations()
    void drain()
  }
  async function authenticate(action: () => Promise<{ error?: unknown }>, message: string) {
    if (authRunning.current) return
    authRunning.current = true; setBusy(true); current.current.setError('')
    try { const result = await action(); if (result.error) throw new Error(message); return true }
    catch { current.current.setError(message); return false }
    finally { authRunning.current = false; setBusy(false) }
  }
  async function start() {
    if (authRunning.current) return
    const email = current.current.draft.email.trim().toLowerCase()
    current.current.setDraft(d => ({ ...d, step: 'code', email }))
    setSendingCode(true)
    const sent = await authenticate(() => authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' }), 'Não foi possível enviar o código. Nova tentativa disponível.')
    setSendingCode(false)
    if (!sent) current.current.setDraft(d => ({ ...d, step: 'email' }))
  }
  async function verify(code: string) {
    if (authRunning.current) return
    const email = current.current.draft.email
    if (!current.current.draft.returning && !new URL(location.href).searchParams.has('invite')) current.current.setDraft(d => ({ ...d, step: 'password' }))
    const verified = await authenticate(() => authClient.signIn.emailOtp({ email, otp: code }), 'Código inválido ou expirado. Nova tentativa disponível.')
    if (!verified) current.current.setDraft(d => ({ ...d, step: 'code' }))
  }
  async function login(password: string) {
    await authenticate(() => authClient.signIn.email({ email: current.current.draft.email.trim().toLowerCase(), password }), 'Email ou palavra-passe inválidos. A recuperação de acesso está disponível.')
  }
  async function google() {
    const callback = new URL(location.href); callback.searchParams.delete('error'); callback.searchParams.delete('error_description')
    await authenticate(() => authClient.signIn.social({ provider: 'google', callbackURL: callback.href, errorCallbackURL: callback.href }), 'Não foi possível iniciar sessão com Google.')
  }
  async function setPassword(newPassword: string) {
    if (authRunning.current) return
    const epoch = generation.current
    authRunning.current = true; setBusy(true); setSavingPassword(true)
    current.current.setError('')
    if (!new URL(location.href).searchParams.has('invite')) current.current.setDraft(d => ({ ...d, step: 'workspace' }))
    try { await onboardingRequest('/password', { newPassword }); if (epoch === generation.current && !pageHidden.current) await reload.current() }
    catch (e) {
      if (epoch !== generation.current || pageHidden.current) return
      current.current.setError(e instanceof SyncError ? e.message : 'Não foi possível guardar a palavra-passe. Nova tentativa disponível.')
      authRunning.current = false
      if (e instanceof SyncError && e.status === 401) await changeEmail()
      else await reload.current()
    } finally { authRunning.current = false; setBusy(false); setSavingPassword(false) }
  }
  async function acceptInvite() {
    if (authRunning.current || !invitation) return
    authRunning.current = true; setBusy(true)
    try {
      const result = await onboardingRequest<Bootstrap>('/join', { token: new URL(location.href).searchParams.get('invite') })
      const url = new URL(location.href); url.searchParams.delete('invite'); history.replaceState(null, '', url)
      record.current = { draft: { ...fresh, email: current.current.draft.email }, revision: result.revision, invitations: [] }
      persist()
      await reload.current()
    } catch (e) { current.current.setError(e instanceof SyncError ? e.message : 'Não foi possível aceitar o convite.') }
    finally { authRunning.current = false; setBusy(false) }
  }
  async function dismissInvite() {
    const url = new URL(location.href); url.searchParams.delete('invite'); history.replaceState(null, '', url)
    await reload.current()
  }
  async function changeEmail() {
    if (authRunning.current) { current.current.setError('Autenticação em curso.'); return }
    if (current.current.session) {
      try { const result = await authClient.signOut(); if (result.error) throw new Error() }
      catch { current.current.setError('Não foi possível terminar a sessão.'); return }
    }
    generation.current++; owner.current = null; state.current = null; previousUser.current = undefined
    clearTimeout(timer.current)
    record.current = { draft: { ...fresh, step: 'email' }, revision: 0, invitations: [] }
    setBootstrap(null); setWorkspaceBusy(false); setSyncStatus('idle'); setFailed(false); setLoading(false); setInvitation(null); setInvitationErrors([]); setInviteLink('')
    current.current.setDraft(record.current.draft)
    persist()
  }
  async function copyInvite() {
    if (busy || !state.current?.organization || state.current.canInvite === false) return
    setBusy(true)
    const epoch = generation.current
    try {
      const token = record.current.link || inviteToken()
      await onboardingRequest('/invite', { token, email: null, organizationId: state.current.organization.id })
      if (epoch !== generation.current) return
      record.current.link = token; persist()
      const link = `${location.origin}/?invite=${token}`
      setInviteLink(link)
      try { await navigator.clipboard.writeText(link); current.current.setNotice('Link de convite copiado.') }
      catch { current.current.setNotice('Link de convite disponível para cópia manual.') }
    } catch (e) { if (e instanceof SyncError && e.status === 410) record.current.link = undefined; current.current.setError(e instanceof SyncError ? e.message : 'Não foi possível criar o link de convite.') }
    finally { setBusy(false) }
  }
  function retryInvitation(token: string, remove = false) {
    if (remove) record.current.invitations = record.current.invitations.filter(i => i.token !== token)
    else record.current.invitations = record.current.invitations.map(i => i.token === token ? { token: i.token, email: i.email, organizationId: i.organizationId, ...(!i.organizationId ? { status: 'failed' as const, error: i.error } : {}) } : i)
    updateInvitations(); void drain()
  }
  return { busy, failed, loading, savingPassword, restoring: !props.preview && !!props.session && !bootstrap && !failed, workspaceBusy, syncStatus, sendingCode, organizationId: bootstrap?.organization?.id, canSaveProfile: !!bootstrap?.organization && !workspaceBusy && !bootstrap.passwordRequired, canCreateWorkspace: !!bootstrap && !loading && !bootstrap.passwordRequired && !bootstrap.accessLost,
    canEditWorkspace: bootstrap?.canEditWorkspace !== false, canInvite: bootstrap?.canInvite !== false,
    invitation, invitationErrors, inviteLink, start, verify, login, google, setPassword, acceptInvite, dismissInvite, save, invite, copyInvite, changeEmail, retryInvitation,
    retry: () => { if (record.current.pending) void drain(); else void reload.current() } }
}
