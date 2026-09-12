import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { authClient, type AuthSession } from './auth'
import { googleSignIn, GoogleSignInError } from './googleSignIn'
import { inviteToken, onboardingRequest, SyncError, type Bootstrap } from './onboardingSync'
import { fresh, saved, steps, type Draft, type Step } from './onboardingDraft'

type Setup = { organizationId?: string; operationId: string; revision: number; name: string; slug: string; profileName: string; profileImage?: string; completed: boolean; automaticSlug?: boolean; workspace?: boolean; changelog: boolean; daily: boolean }
type Invitation = { organizationId?: string; awaitingWorkspace?: boolean; token: string; email: string; status?: 'sent' | 'failed'; error?: string }
type Record = { needsConfirmation?: boolean; completionRequested?: boolean; draft: Draft; revision: number; pending?: Setup; invitations: Invitation[]; link?: string }
type Props = { imagePending?: boolean; preview: boolean; session: AuthSession | null; draft: Draft; setDraft: Dispatch<SetStateAction<Draft>>; setNotice: (message: string) => void; setError: (message: string, field?: string) => void; onReady?: (state: Bootstrap) => void; onBlocked?: () => void }
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
  const invitationsRunning = useRef(false)
  const wantsInviteLink = useRef(false)
  const completionRequested = useRef(false)
  const requiresVerification = useRef(false)
  const authRunning = useRef(false)
  const googleAbort = useRef<AbortController | null>(null)
  const googlePrepared = useRef<{ sessionId: string; userId: string; resolve: () => void } | null>(null)
  const [googleSession, setGoogleSession] = useState('')
  const [googleActive, setGoogleActive] = useState(false)
  useEffect(() => () => { googleAbort.current?.abort(); googlePrepared.current?.resolve() }, [])
  // Credentials wait in memory for verification, never in the persisted draft.
  const pendingPassword = useRef<string | null>(null)
  const passwordRunning = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const attempts = useRef(0)
  const reload = useRef<() => Promise<void>>(async () => {})
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [issue, setIssue] = useState<Step | null>(null)
  const [loading, setLoading] = useState(false)
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null)
  const [invitationErrors, setInvitationErrors] = useState<Invitation[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const slugRetries = useRef(0)

  useEffect(() => {
    const leaving = () => { pageHidden.current = true; clearTimeout(timer.current) }
    const returning = (event: PageTransitionEvent) => { pageHidden.current = false; if (event.persisted && owner.current) void reload.current() }
    addEventListener('beforeunload', leaving); addEventListener('pagehide', leaving); addEventListener('pageshow', returning)
    return () => { removeEventListener('beforeunload', leaving); removeEventListener('pagehide', leaving); removeEventListener('pageshow', returning) }
  }, [])

  function persist(draftOnly = false) {
    try {
      record.current.completionRequested = completionRequested.current
      if (owner.current) {
        // Each tab owns its unsent edits. Only server/outbox changes notify other tabs.
        sessionStorage.setItem(prefix + 'tab:' + owner.current, JSON.stringify(record.current))
        if (!draftOnly) localStorage.setItem(prefix + owner.current, JSON.stringify(record.current))
      }
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
    if (result.organization) {
      // Members cannot edit workspace identity. Repair old, rejected invitation
      // snapshots from the confirmed workspace before the outbox retries them.
      const pending = record.current.pending
      if (result.canEditWorkspace === false && pending?.organizationId === result.organization.id && !pending.workspace) {
        pending.name = result.organization.name
        pending.slug = result.organization.slug
      }
      for (const item of record.current.invitations) {
        if (item.awaitingWorkspace) { item.organizationId = result.organization.id; delete item.awaitingWorkspace }
      }
    }
  }
  function openIfReady() {
    const s = state.current
    if (current.current.imagePending || record.current.needsConfirmation || requiresVerification.current) return
    if (completionRequested.current && current.current.draft.step !== 'updates') return
    if (!s?.project || !s.organization || s.passwordRequired || s.accessLost || new URL(location.href).searchParams.has('invite')) return
    const d = current.current.draft
    // Entry can use an already confirmed workspace/profile. Only the optional
    // preferences and completion marker may still be in the persisted outbox.
    const confirmedSetup = completionRequested.current && d.step === 'updates' && record.current.pending?.completed &&
      !record.current.pending.workspace && s.organization.name === d.name.trim() && s.organization.slug === d.slug &&
      s.profile.name === d.profile.trim() && (s.profile.image || '') === d.image
    if ((s.completed && !record.current.pending) || confirmedSetup) current.current.onReady?.(s)
  }
  // Restoration updates the draft after the server response. Recheck readiness
  // once that step is rendered, so confirmed completion also survives a reload.
  useEffect(() => { openIfReady() }, [props.draft.step])
  function schedule(error?: unknown) {
    clearTimeout(timer.current)
    const delay = error instanceof SyncError && error.retryAfter ? error.retryAfter : Math.min(30000, 1000 * 2 ** Math.min(attempts.current++, 5))
    timer.current = setTimeout(() => { void drain() }, delay)
  }
  async function drain() {
    if (record.current.needsConfirmation || requiresVerification.current || running.current || !owner.current || !state.current || state.current.passwordRequired || props.preview) return
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
          // A final response must include edits made while that request was in flight.
          const latest = current.current.draft
          if (snapshot.completed && latest.step === 'updates' && !record.current.pending &&
            (latest.changelog !== snapshot.changelog || latest.daily !== snapshot.daily || latest.profile.trim() !== snapshot.profileName || latest.image !== (snapshot.profileImage || ''))) save(true)
          persist()
          if (snapshot.workspace) {
            setWorkspaceBusy(false)
            // Profile drafting may already be underway. Never navigate on a late save.
          }
          openIfReady()
          continue
        }
        openIfReady()
        void deliverInvitations()
        if (wantsInviteLink.current) void copyInvite()
        break
      }
      attempts.current = 0
      if (!record.current.pending) setSyncStatus('saved')
      current.current.setError('')
    } catch (error) {
      if (epoch !== generation.current) return
      const pending = record.current.pending
      if (error instanceof SyncError && error.status === 409 && error.step === 'workspace' && pending?.automaticSlug && slugRetries.current++ < 3) {
        pending.slug = `${pending.slug.slice(0, 41)}-${crypto.randomUUID().slice(0, 6)}`
        record.current.draft = { ...record.current.draft, slug: pending.slug }
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
          record.current.needsConfirmation = true
          record.current.pending = undefined
          current.current.onBlocked?.()
          persist()
          await reload.current()
          setIssue('profile')
          current.current.setNotice('Alterações noutra janela. O rascunho foi preservado e pode ser confirmado aqui.')
        } else if (error instanceof SyncError && error.status === 401) {
          renewAuthentication()
        } else if (error instanceof SyncError && error.status === 403) {
          if (state.current) receive({ ...state.current, accessLost: true })
          current.current.onBlocked?.()
          await reload.current()
        } else if (error instanceof SyncError && steps.includes(error.step as Step)) {
          setIssue(error.step as Step)
          current.current.onBlocked?.()
        }
      }
    } finally {
      running.current = false
      if (epoch !== generation.current && owner.current) void drain()
    }
  }

  async function deliverInvitations() {
    if (invitationsRunning.current || !owner.current || !state.current?.organization || state.current.passwordRequired) return
    const epoch = generation.current
    invitationsRunning.current = true
    try {
      while (epoch === generation.current) {
        const item = record.current.invitations.find(i => !i.status)
        if (!item || item.awaitingWorkspace) break
        try {
          await onboardingRequest('/invite', { token: item.token, email: item.email, organizationId: item.organizationId })
          if (epoch !== generation.current) return
          item.status = 'sent'
        } catch (error) {
          if (epoch !== generation.current) return
          item.status = 'failed'
          item.error = error instanceof SyncError ? error.message : 'Envio por confirmar. Nova tentativa disponível.'
        }
        updateInvitations()
      }
    } finally {
      invitationsRunning.current = false
      if (epoch !== generation.current && owner.current) void deliverInvitations()
    }
  }

  useEffect(() => {
    if (props.preview) return
    record.current.draft = props.draft
    persist(true)
  }, [props.draft, props.preview])

  useEffect(() => {
    if (props.preview) return
    if (!props.session) {
      if (requiresVerification.current) { setBootstrap(null); return }
      if (previousUser.current) {
        previousUser.current = undefined
        pendingPassword.current = null; setSavingPassword(false)
        record.current = { draft: { ...fresh }, revision: 0, invitations: [] }
        setBootstrap(null); setLoading(false); setFailed(false); setIssue(null); setWorkspaceBusy(false); setSyncStatus('idle')
        setInvitationErrors([]); setInviteLink('')
        current.current.setDraft({ ...fresh }); current.current.setNotice(''); current.current.setError('')
        try { sessionStorage.removeItem(prefix + 'pending') } catch { /* optional storage */ }
      }
      completionRequested.current = false; wantsInviteLink.current = false; requiresVerification.current = false
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
    const initial = current.current.draft.email.toLowerCase() === session.user.email.toLowerCase() ? current.current.draft : { ...fresh, provider: current.current.draft.provider }
    if (initial !== current.current.draft) { pendingPassword.current = null; completionRequested.current = false; wantsInviteLink.current = false; requiresVerification.current = false; setSavingPassword(false) }
    const pendingSetup = initial === current.current.draft ? record.current.pending : undefined
    const pendingInvitations = initial === current.current.draft ? record.current.invitations : []
    record.current = { pending: pendingSetup, draft: { ...initial, email: session.user.email, profile: initial.profile || session.user.name || session.user.email.split('@')[0] }, revision: 0, invitations: pendingInvitations }
    let restored = false
    try {
      const value = JSON.parse(sessionStorage.getItem(prefix + 'tab:' + session.user.id) || localStorage.getItem(prefix + session.user.id) || 'null')
      const draft = saved(value?.draft)
      if (!pendingSetup && pendingPassword.current === null && draft && draft.email === session.user.email && Number.isSafeInteger(value.revision) && Array.isArray(value.invitations)) {
        restored = true
        // Only accept known shapes. Legacy local completion is never authoritative.
        record.current = { draft, needsConfirmation: value.needsConfirmation === true, completionRequested: value.completionRequested === true, revision: value.revision, invitations: value.invitations.filter((i: Invitation) => typeof i.email === 'string' && /^[a-f0-9]{64}$/.test(i.token)),
          pending: value.pending && typeof value.pending.operationId === 'string' && Number.isSafeInteger(value.pending.revision) && typeof value.pending.name === 'string' && typeof value.pending.profileName === 'string' ? value.pending : undefined }
      }
    } catch { /* Recover from server when local data is corrupt. */ }
    completionRequested.current = !!record.current.pending?.completed || record.current.completionRequested === true
    const load = async () => {
      setLoading(true)
      try {
        let result = await onboardingRequest<Bootstrap>()
        if (epoch !== generation.current) return
        const invite = new URL(location.href).searchParams.get('invite')
        if (invite && !result.passwordRequired) {
          result = await onboardingRequest<Bootstrap>('/join', { token: invite })
          if (epoch !== generation.current) return
          const url = new URL(location.href); url.searchParams.delete('invite'); history.replaceState(null, '', url)
          record.current = { draft: { ...fresh, step: 'profile', email: session.user.email, name: result.organization?.name || '', slug: result.organization?.slug || '', profile: result.profile.name, image: result.profile.image || '', changelog: result.changelog, daily: result.daily }, revision: result.revision, invitations: [] }
          restored = false
          completionRequested.current = false
          persist()
        }
        const previous = state.current
        const sameRevision = restored && record.current.revision === result.revision
        receive(result)
        setFailed(!!record.current.needsConfirmation)
        if (record.current.needsConfirmation) setIssue('profile')
        const pending = record.current.pending
        if (pending?.revision && result.revision >= pending.revision) {
          record.current.pending = undefined
          if (result.operationId !== pending.operationId) {
            record.current.needsConfirmation = true
            setFailed(true); setIssue('profile')
            current.current.setNotice('Alterações noutra janela. O rascunho foi preservado e pode ser confirmado aqui.')
          }
        }
        const d = record.current.draft
        const keep = record.current.needsConfirmation || sameRevision || !!record.current.pending || (!result.organization && !!d.name)
        const token = new URL(location.href).searchParams.get('invite')
        let step: Step = result.passwordRequired ? 'password' : token ? 'join' : result.organization ? 'profile' : 'workspace'
        if (!result.passwordRequired && !token && result.organization && ['profile', 'invites', 'updates'].includes(d.step)) step = d.step
        // Background responses repair prerequisites in place; they never rewind a draft.
        const drafting = ['workspace', 'profile', 'invites', 'updates'].includes(d.step)
        if (!token && drafting) step = d.step
        if (result.passwordRequired && drafting && pendingPassword.current === null && !passwordRunning.current) {
          setIssue('password')
          current.current.setError('A palavra-passe ainda não está confirmada. É possível defini-la aqui sem perder a configuração.')
        }
        if (step === 'invites' && result.canInvite === false && !record.current.pending?.workspace) step = 'updates'
        current.current.setDraft({ ...d, step, email: session.user.email,
          name: result.canEditWorkspace === false && result.organization ? result.organization.name : keep || (previous && d.name !== previous.organization?.name) ? d.name : result.organization?.name || d.name,
          slug: result.canEditWorkspace === false && result.organization ? result.organization.slug : keep || (previous && d.slug !== previous.organization?.slug) ? d.slug : result.organization?.slug || d.slug,
          profile: ((keep || (previous && d.profile !== previous.profile.name)) ? d.profile : result.profile.name || d.profile) || session.user.name || session.user.email.split('@')[0],
          image: keep || (previous && d.image !== (previous.profile.image || '')) ? d.image : result.profile.image || '',
          changelog: keep || (previous && d.changelog !== previous.changelog) ? d.changelog : result.changelog,
          daily: keep || (previous && d.daily !== previous.daily) ? d.daily : result.daily })
        setWorkspaceBusy(!!record.current.pending?.workspace)
        for (const item of record.current.invitations) if (!item.organizationId && !item.awaitingWorkspace && item.status !== 'sent') { item.status = 'failed'; item.error = 'Convite antigo sem ambiente confirmado. É necessário remover e criar novamente.' }
        updateInvitations()
        if (result.passwordRequired || result.accessLost) current.current.onBlocked?.()
        if (result.accessLost) throw new SyncError(403, 'O acesso ao ambiente deixou de estar disponível.')
        openIfReady()
        if (!result.passwordRequired) void drain()
      } catch (error) {
        if (epoch !== generation.current) return
        setFailed(true)
        if (new URL(location.href).searchParams.has('invite')) current.current.setDraft(d => ({ ...d, step: 'join' }))
        if (!state.current || (error instanceof SyncError && [401, 403].includes(error.status))) current.current.onBlocked?.()
        current.current.setError(error instanceof SyncError ? error.message : 'Ambiente indisponível. Nova tentativa em instantes.')
        if (transient(error)) timer.current = setTimeout(() => { void load() }, error instanceof SyncError && error.retryAfter ? error.retryAfter : 5000)
      } finally { if (epoch === generation.current) { setLoading(false); void flushPassword() } }
    }
    reload.current = load
    void load()
    const online = () => { if (record.current.pending && state.current && !state.current.passwordRequired) void drain(); else void load() }
    const storage = (e: StorageEvent) => {
      if (e.key !== prefix + session.user.id || !e.newValue || running.current) return
      try {
        const incoming = JSON.parse(e.newValue)
        // Draft writes and the acknowledgements from this revision are not new server state.
        if (Number.isSafeInteger(incoming.revision) && incoming.revision > record.current.revision) void load()
      } catch { /* Ignore invalid records from an older tab. */ }
    }
    addEventListener('online', online)
    addEventListener('storage', storage)
    return () => { generation.current++; owner.current = null; state.current = null; clearTimeout(timer.current); removeEventListener('online', online); removeEventListener('storage', storage) }
  }, [props.session?.user.id, props.session?.session.id, props.preview])

  function save(completed = false, workspace = false) {
    const queuedCredential = pendingPassword.current !== null || passwordRunning.current
    const pending = record.current.pending
    if ((!state.current || state.current.passwordRequired) && !queuedCredential && !pending) return
    if (state.current?.accessLost) return
    const d = current.current.draft
    if (completed) completionRequested.current = true
    const complete = completed || !!pending?.completed || (completionRequested.current && d.step === 'updates')
    record.current.needsConfirmation = false
    const confirmed = state.current
    if (!workspace && !complete && !pending && confirmed?.project && confirmed.organization?.name === d.name.trim() && confirmed.organization.slug === d.slug &&
      confirmed.profile.name === d.profile.trim() && (confirmed.profile.image || '') === d.image && confirmed.changelog === d.changelog && confirmed.daily === d.daily) {
      setIssue(value => value === 'profile' ? null : value); setFailed(false); current.current.setError(''); persist(); return
    }
    const creating = workspace || !!pending?.workspace
    record.current.pending = { organizationId: state.current?.organization?.id, operationId: crypto.randomUUID(), revision: 0, name: d.name.trim(), slug: d.slug,
      profileName: d.profile.trim() || d.email.split('@')[0], profileImage: d.image, completed: complete, automaticSlug: creating, workspace: creating, changelog: d.changelog, daily: d.daily }
    record.current.draft = d
    setIssue(value => value === 'workspace' || value === 'profile' ? null : value)
    setSyncStatus('saving')
    if (workspace) { slugRetries.current = 0; setWorkspaceBusy(true); if (d.step === 'workspace') current.current.setDraft(d => ({ ...d, step: 'profile' })) }
    persist()
    void drain()
    openIfReady()
  }
  // Image decoding can finish after all forms have been submitted. Save that result
  // before entry, while allowing forward navigation throughout decoding.
  useEffect(() => {
    if (!props.imagePending && completionRequested.current && current.current.draft.step === 'updates') save(true)
  }, [props.imagePending])

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
    if (!record.current.pending?.workspace && (state.current?.canInvite === false || !state.current?.organization)) return
    for (const email of new Set(addresses.map(v => v.trim().toLowerCase()))) {
      if (email !== current.current.draft.email.toLowerCase() && !record.current.invitations.some(i => i.email === email)) record.current.invitations.push({ email, token: inviteToken(), organizationId: state.current?.organization?.id, ...(!state.current?.organization ? { awaitingWorkspace: true } : {}) })
    }
    updateInvitations()
    void drain()
  }
  async function authenticate(action: () => Promise<{ error?: unknown }>, message: string, field?: string) {
    if (authRunning.current) return
    authRunning.current = true; setBusy(true); current.current.setError('')
    try {
      const result = await action()
      if (result.error) {
        if (typeof result.error === 'object' && 'code' in result.error && result.error.code === 'REGISTRATION_ACCOUNT_EXISTS') {
          current.current.setDraft(d => ({ ...d, step: 'email', returning: true }))
          setIssue('email')
          current.current.setError('Email já registado. Início de sessão com palavra-passe ou Google; recuperação de acesso disponível.')
          return false
        }
        const status = typeof result.error === 'object' && 'status' in result.error ? Number(result.error.status) : 0
        const unavailable = status >= 500 || status === 429
        current.current.setError(unavailable ? 'Não foi possível concluir o pedido. Nova tentativa disponível.' : message, unavailable ? undefined : field)
        return false
      }
      return true
    } catch { current.current.setError('Ligação interrompida. Nova tentativa disponível.'); return false }
    finally { authRunning.current = false; setBusy(false); void flushPassword() }
  }
  async function start() {
    if (authRunning.current) return
    const email = current.current.draft.email.trim().toLowerCase()
    current.current.setDraft(d => ({ ...d, step: ['start', 'email'].includes(d.step) ? 'code' : d.step, email }))
    setSendingCode(true)
    const sent = await authenticate(() => authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' }), 'Não foi possível enviar o código. Nova tentativa disponível.')
    setSendingCode(false)
    if (!sent) setIssue(value => value === 'email' ? value : 'code')
  }
  async function verify(code: string) {
    if (authRunning.current) return
    const email = current.current.draft.email
    if (current.current.draft.step === 'code' && !current.current.draft.returning && !new URL(location.href).searchParams.has('invite')) current.current.setDraft(d => ({ ...d, step: 'password' }))
    const verified = await authenticate(() => authClient.signIn.emailOtp({ email, otp: code }), 'Código inválido ou expirado. Nova tentativa disponível.', 'code')
    if (!verified) {
      setIssue(value => value === 'email' ? value : 'code')
    } else {
      setIssue(value => value === 'code' ? null : value)
    }
  }
  async function login(password: string) {
    const success = await authenticate(() => authClient.signIn.email({ email: current.current.draft.email.trim().toLowerCase(), password }), 'Email ou palavra-passe inválidos. A recuperação de acesso está disponível.', 'oldPassword')
    if (success && requiresVerification.current) {
      requiresVerification.current = false
      setIssue(null)
      await reload.current()
    }
    return success
  }
  // Resolve only after React has committed the authenticated destination or a
  // recoverable error. Closing the Google window then cannot expose an empty page.
  useEffect(() => {
    const pending = googlePrepared.current
    if (pending && props.session?.session.id === pending.sessionId && props.session.user.id === pending.userId &&
      !loading && (failed || (bootstrap && !['start', 'email', 'code'].includes(props.draft.step)))) {
      googlePrepared.current = null
      pending.resolve()
    }
  }, [googleSession, props.session, props.draft.step, loading, bootstrap, failed])

  async function google() {
    if (authRunning.current) return
    authRunning.current = true; setBusy(true); current.current.setError('')
    const controller = new AbortController()
    googleAbort.current = controller
    setGoogleActive(true)
    record.current.draft = { ...current.current.draft, provider: 'google' }
    current.current.setDraft(record.current.draft)
    persist(true)
    try {
      await googleSignIn(session => new Promise<void>((resolve, reject) => {
        requiresVerification.current = false
        setIssue(null)
        const timeout = setTimeout(() => { googlePrepared.current = null; reject(new Error('Setup confirmation timed out')) }, 25000)
        googlePrepared.current = { sessionId: session.session.id, userId: session.user.id, resolve: () => { clearTimeout(timeout); resolve() } }
        setGoogleSession(session.session.id)
      }), controller.signal)
    } catch (error) {
      if (!controller.signal.aborted) current.current.setError(error instanceof GoogleSignInError ? error.message : 'Não foi possível concluir o início de sessão com Google. Nova tentativa disponível.')
    } finally {
      googleAbort.current = null
      setGoogleActive(false)
      authRunning.current = false; setBusy(false)
    }
  }
  function setPassword(newPassword: string) {
    if (pendingPassword.current !== null || passwordRunning.current) return
    pendingPassword.current = newPassword
    setSavingPassword(true)
    setIssue(value => value === 'password' ? null : value)
    current.current.setError('')
    if (current.current.draft.step === 'password' && !new URL(location.href).searchParams.has('invite')) current.current.setDraft(d => ({ ...d, step: 'workspace' }))
    void flushPassword()
  }
  async function flushPassword() {
    if (requiresVerification.current || pendingPassword.current === null || passwordRunning.current || authRunning.current || !owner.current || !state.current || pageHidden.current) return
    const epoch = generation.current
    const newPassword = pendingPassword.current
    pendingPassword.current = null
    // Accounts with a login method do not need initial password setup.
    if (!state.current.passwordRequired) { setSavingPassword(false); void drain(); return }
    passwordRunning.current = true
    try {
      const saved = await authClient.$fetch('/set-password', { method: 'POST', body: { password: '', 'new-password': newPassword } })
      if (saved.error) throw new SyncError(saved.error.status, saved.error.message || 'Não foi possível guardar a palavra-passe.')
      authClient.$store.notify('$sessionSignal')
      const result = { ...state.current, passwordRequired: false, hasPassword: true }
      if (epoch !== generation.current || pageHidden.current) return
      receive(result)
      setIssue(value => value === 'password' ? null : value)
      persist()
      if (new URL(location.href).searchParams.has('invite')) await reload.current()
      else { openIfReady(); void drain() }
    } catch (e) {
      if (epoch !== generation.current || pageHidden.current) return
      passwordRunning.current = false
      current.current.setError(e instanceof SyncError ? e.message : 'Não foi possível guardar a palavra-passe. Nova tentativa disponível.', e instanceof SyncError && [400, 422].includes(e.status) ? 'password' : undefined)
      if (e instanceof SyncError && e.status === 401) { pendingPassword.current = newPassword; renewAuthentication() }
      else {
        setIssue('password')
        await reload.current()
        current.current.setError(e instanceof SyncError ? e.message : 'Não foi possível guardar a palavra-passe. Nova tentativa disponível.', e instanceof SyncError && [400, 422].includes(e.status) ? 'password' : undefined)
      }
    } finally { passwordRunning.current = false; setSavingPassword(false) }
  }
  async function acceptInvite() {
    if (!loading) { current.current.setError(''); await reload.current() }
  }
  async function dismissInvite() {
    const url = new URL(location.href); url.searchParams.delete('invite'); history.replaceState(null, '', url)
    await reload.current()
  }
  function renewAuthentication() {
    requiresVerification.current = true
    current.current.onBlocked?.()
    pendingPassword.current = null; setSavingPassword(false)
    current.current.setDraft(d => ({ ...d, step: 'email', returning: true }))
    setIssue('email')
    current.current.setError('A sessão expirou. Início de sessão com palavra-passe ou Google; recuperação de acesso disponível. O rascunho foi preservado.')
  }
  async function changeEmail() {
    if (authRunning.current || passwordRunning.current) { current.current.setError('Autenticação em curso.'); return }
    pendingPassword.current = null; setSavingPassword(false); wantsInviteLink.current = false; completionRequested.current = false; requiresVerification.current = false
    if (current.current.session) {
      try { const result = await authClient.signOut(); if (result.error) throw new Error() }
      catch { current.current.setError('Não foi possível terminar a sessão.'); return }
    }
    generation.current++; owner.current = null; state.current = null; previousUser.current = undefined
    clearTimeout(timer.current)
    record.current = { draft: { ...fresh, step: 'email' }, revision: 0, invitations: [] }
    setBootstrap(null); setWorkspaceBusy(false); setSyncStatus('idle'); setFailed(false); setIssue(null); setLoading(false); setInvitationErrors([]); setInviteLink('')
    current.current.setDraft(record.current.draft)
    persist()
  }
  async function copyInvite() {
    if (!state.current?.organization && record.current.pending?.workspace) { wantsInviteLink.current = true; return }
    if (busy || !state.current?.organization || state.current.canInvite === false) return
    wantsInviteLink.current = false
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
  return { googleActive, cancelGoogle: () => { googleAbort.current?.abort(); googlePrepared.current?.resolve() }, busy, failed, issue, loading, savingPassword, restoring: !props.preview && !!props.session && !bootstrap && !failed, workspaceBusy, syncStatus, sendingCode, organizationId: bootstrap?.organization?.id, canSaveProfile: !!record.current.pending || (!!bootstrap?.organization && !bootstrap.passwordRequired), canCreateWorkspace: !!record.current.pending || pendingPassword.current !== null || savingPassword || (!!bootstrap && !loading && !bootstrap.passwordRequired && !bootstrap.accessLost),
    canEditWorkspace: !!record.current.pending?.workspace || bootstrap?.canEditWorkspace !== false, canInvite: !!record.current.pending?.workspace || bootstrap?.canInvite !== false,
    invitationErrors, inviteLink, start, verify, login, google, setPassword, acceptInvite, dismissInvite, save, invite, copyInvite, changeEmail, retryInvitation,
    retry: () => { if (record.current.pending && state.current && !state.current.passwordRequired) void drain(); else void reload.current() } }
}
