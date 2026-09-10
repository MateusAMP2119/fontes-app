import OnboardingLayout from './OnboardingLayout'
import { FieldError, Icon, Toast } from './OnboardingFeedback'
import { recoveryURL } from './authDestination'
import { fresh, saved, steps, type Step, type Draft } from './onboardingDraft'
import { PasswordField } from './Password'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import './Onboarding.css'
import { type AuthSession } from './auth'
import { createAvatar, type Style } from '@dicebear/core'
import { adventurerNeutral, avataaarsNeutral, bigEarsNeutral, botttsNeutral, croodlesNeutral, loreleiNeutral, notionistsNeutral, pixelArtNeutral, thumbs } from '@dicebear/collection'
import { useOnboardingSync } from './useOnboardingSync'
import type { Bootstrap } from './onboardingSync'

const key = 'fontes:onboarding-ui-preview:v1'
const labels = ['Início', 'Email', 'Código', 'Palavra-passe', 'Ligação ao ambiente', 'Ambiente', 'Perfil', 'Convites', 'Atualizações']
// Each entry path counts only the screens it actually shows: Google skips the email hand-off,
// and a returning profile just confirms its identity.
const flows: Record<'email' | 'google' | 'returning', Step[]> = { email: ['email', 'code', 'password', 'workspace', 'profile', 'invites', 'updates'], google: ['workspace', 'profile', 'invites', 'updates'], returning: ['email', 'code'] }
function restore(): Draft {
  try {
    const value = saved(JSON.parse(localStorage.getItem(key) || 'null'))
    if (value) return value
  } catch { /* Preview also works with storage disabled. */ }
  return fresh
}
function restorePending(session: AuthSession | null): Draft {
  const initial = { ...fresh, step: location.pathname === '/login' ? 'email' : 'start', returning: location.pathname === '/login' } as Draft
  try {
    const value = saved(JSON.parse(sessionStorage.getItem('fontes:onboarding:v1:pending') || 'null')?.draft)
    if (location.pathname === '/login') return { ...initial, provider: value?.provider || 'email' }
    if (value) return { ...value, step: !session && !['start', 'email', 'code'].includes(value.step) ? 'code' : value.step }
  } catch { /* No saved draft. */ }
  return initial
}
function slug(value: string) {
  const base = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
  return !base ? 'equipa' : base.length < 3 ? `${base}-equipa` : base
}
function Google() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.6Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.4-2.6Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>
}
// Every DiceBear style that draws a face and nothing else, no hair, no skin, no body, so
// nothing in a mark reads as a gender. The seed picks the style as well as the face, and the
// ground takes the app's own violets and teals; thumbs is the one that colours its shape too,
// and it stays pale, which holds on both themes.
// Drawn once per seed, since the screen redraws on every keystroke of the name.
// The styles' option types have nothing in common, so the array is typed by what is passed:
// the shared ground and scale, plus thumbs' own shape colour.
const faces: Style<Record<string, unknown>>[] = [adventurerNeutral, avataaarsNeutral, bigEarsNeutral, botttsNeutral, croodlesNeutral, loreleiNeutral, notionistsNeutral, pixelArtNeutral, thumbs]
const grounds = ['8178d6', '5b8def', '3fa9a0', 'b98cf0', '2f3a72']
const shapes = ['ffffff', 'f2f0ff', 'e8f7f4']
function Avatar({ seed }: { seed: string }) {
  const picture = useMemo(() => {
    let hash = 0x811c9dc5
    for (const char of seed) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193) }
    const face = faces[(hash >>> 0) % faces.length]
    return createAvatar(face, { seed, backgroundColor: grounds, scale: 85, ...(face === thumbs ? { shapeColor: shapes } : {}) }).toDataUri()
  }, [seed])
  return <img className="ob-avatar" src={picture} alt=""/>
}
/** The hint promises a comma list, so typed or pasted line breaks become one. */
export function commas(value: string) { return value.replace(/\s*[\n;]+\s*/g, ', ') }

function Field({ label, children, name, error, hint }: { label: string; children: ReactNode; name?: string; error?: string; hint?: string }) { return <label className="ob-field"><span>{label}</span>{children}<FieldError id={`ob-${name}-error`} message={error} hint={hint} hintId={`ob-${name}-hint`}/></label> }

function StepPanel({ step, children }: { step: Step; children: ReactNode }) {
  const panel = useRef<HTMLElement>(null)
  useEffect(() => { panel.current?.querySelector<HTMLHeadingElement>('h1')?.focus({ preventScroll: true }) }, [step])
  return <section ref={panel} className={`ob-panel ob-${step}`} aria-labelledby="ob-title">{children}</section>
}

/** Shared signup/onboarding screens; simulation is available only on the development preview route. */
export default function Onboarding({ preview = false, session = null, onReady, onBlocked, background = false }: { background?: boolean; preview?: boolean; session?: AuthSession | null; onReady?: (state: Bootstrap) => void; onBlocked?: () => void }) {
  const [draft, setDraft] = useState(() => preview ? restore() : restorePending(session))
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const imageGeneration = useRef(0)
  const [imagePending, setImagePending] = useState(false)
  // The code and the password outlive a step change on the preview, so a screen already answered is
  // not answered twice. The live flow still drops the credential the moment its screen is left, and
  // a different email invalidates both everywhere.
  useEffect(() => { if (!preview) { setPassword(''); setCode('') } }, [preview, draft.step])
  useEffect(() => { setPassword(''); setCode('') }, [draft.email])
  useEffect(() => { imageGeneration.current++; setImagePending(false); return () => { imageGeneration.current++ } }, [draft.email])
  const [notice, setNotice] = useState('')
  const [fieldError, setFieldError] = useState<{ name: string; text: string } | null>(null)
  const fieldMessage = (name: string) => fieldError?.name === name ? fieldError.text : undefined
  const fieldProps = (name: string) => ({ name, 'aria-invalid': fieldMessage(name) ? true : undefined, 'aria-describedby': fieldMessage(name) ? `ob-${name}-error` : ['invitations', 'code'].includes(name) ? `ob-${name}-hint` : undefined })
  const [error, setError] = useState<{ text: string; n: number } | null>(() => new URL(location.href).searchParams.has('error') ? { text: 'Não foi possível concluir a autenticação. Nova tentativa disponível.', n: 0 } : null)
  const toast = (text: string, field?: string) => {
    setFieldError(text && field ? { name: field, text } : null)
    setError(prev => text && !field ? { text, n: (prev?.n ?? 0) + 1 } : null)
  }
  // The last save opens the workspace on its own, so the button only reports that it is running.
  const [finishing, setFinishing] = useState(false)
  useEffect(() => { setFinishing(false) }, [draft.step, draft.changelog, draft.daily])
  const live = useOnboardingSync({ preview, session, imagePending, draft, setDraft, setNotice, setError: toast, onReady, onBlocked })
  // Keep a visible form in place while authentication finishes. On a fresh
  // callback, paint the brand and the first confirmed screen in the same commit.
  const screenShown = useRef(false)
  if (!live.restoring || !['start', 'email', 'code'].includes(draft.step)) screenShown.current = true
  const file = useRef<HTMLInputElement>(null)
  const patch = (value: Partial<Draft>) => setDraft(current => ({ ...current, ...value }))
  const go = (step: Step) => { if ((live.busy || live.restoring) && ['start', 'email', 'code'].includes(draft.step)) return; patch({ step }); setNotice(''); setError(null); setFieldError(null) }
  useEffect(() => { if (preview) { try { localStorage.setItem(key, JSON.stringify(draft)) } catch { /* In-memory fallback. */ } } }, [draft, preview])
  const email = draft.email || 'email@email.com'

  const titles: Record<Step, string> = { start: 'Criar conta', email: draft.returning ? 'Iniciar sessão' : 'Registar email', code: 'Confirmar email', password: 'Definir palavra-passe', join: 'Ligação ao ambiente', workspace: 'Novo ambiente de trabalho', profile: 'Personalizar perfil', invites: 'Convidar membros', updates: 'Preferências de email' }
  const descriptions: Partial<Record<Step, ReactNode>> = {
    start: 'Configurações de acessos antes da criação de um ambiente de trabalho.',
    email: draft.returning ? 'Acesso com Google, palavra-passe ou código de email.' : 'Criar uma nova conta através email e código de confirmação.',
    code: <>{live.sendingCode ? 'Envio de código em curso para ' : 'Foi enviado um código temporário para '}<strong>{email}</strong>.</>,
    password: 'A palavra-passe permite voltar a iniciar sessão com este email.',
    workspace: 'Ambientes de trabalho estão desenhados para colaboração dentro de equipas.',
    profile: 'Nomes e imagens podem ser visíveis a outros utilizadores.',
    invites: 'Novos convites podem ser feitos a qualquer altura.',
    updates: 'Preferências opcionais para novidades e resumos diários.',
  }
  // The picture is cropped square and redrawn at 160px before it goes anywhere: the draft is
  // carried in storage and in the setup payload, and a phone camera's original is megabytes.
  async function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const epoch = ++imageGeneration.current
    setImagePending(false)
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Formato de imagem inválido'); return }
    if (file.size > 12_000_000) { toast('Imagem acima de 12 MB'); return }
    setImagePending(true)
    try {
      const source = await createImageBitmap(file)
      if (epoch !== imageGeneration.current) { source.close(); return }
      const side = Math.min(source.width, source.height)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 160
      const context = canvas.getContext('2d')
      if (!context) throw new Error('sem canvas')
      context.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, 160, 160)
      source.close()
      if (epoch !== imageGeneration.current) return
      patch({ image: canvas.toDataURL('image/webp', 0.85) })
      setError(null)
    } catch { if (epoch === imageGeneration.current) toast('Imagem ilegível') }
    finally { if (epoch === imageGeneration.current) setImagePending(false) }
  }
  function validate(form: HTMLFormElement) {
    const invalid = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(':invalid')
    if (!invalid) { setFieldError(null); return true }
    const messages: Record<string, string> = { email: 'Endereço de email inválido', code: 'Código de seis dígitos em falta', password: 'A palavra-passe deve ter entre 8 e 128 caracteres.', oldPassword: 'Palavra-passe em falta', name: 'Nome do ambiente em falta', profile: 'Nome de perfil em falta' }
    toast(invalid.title || messages[invalid.name] || 'Campo por preencher', invalid.name)
    invalid.focus({ preventScroll: true })
    return false
  }
  function clearFieldError(event: FormEvent<HTMLFormElement>) {
    if ((event.target as HTMLInputElement).name === fieldError?.name) setFieldError(null)
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate(event.currentTarget)) return
    if (!preview && draft.step === 'email') { if (draft.returning) { void live.login(password).then(success => { if (success) setPassword('') }) } else void live.start(); return }
    if (draft.step === 'password') { if (preview) go('workspace'); else { void live.setPassword(password); setPassword('') }; return }
    if (draft.step === 'join') { if (preview) setNotice('Pré-visualização concluída'); else void live.acceptInvite(); return }
    if (!preview && draft.step === 'code') { void live.verify(code); return }
    if (!preview && draft.step === 'workspace') { live.save(false, true); return }
    if (!preview && draft.step === 'profile' && !live.canSaveProfile) return
    if (!preview && ['profile', 'updates'].includes(draft.step)) live.save(draft.step === 'updates')
    if (preview && draft.step === 'email' && draft.returning) { setNotice('Pré-visualização concluída'); return }
    if (draft.step === 'email') { patch({ profile: draft.profile || draft.email.split('@')[0].replace(/[._-]+/g, ' ') }); go('code') }
    if (draft.step === 'code') { if (draft.returning) setNotice('Pré-visualização concluída'); else go('password') }
    if (draft.step === 'workspace') go('profile')
    if (draft.step === 'profile') go(live.canInvite ? 'invites' : 'updates')
    if (draft.step === 'invites') {
      const addresses = draft.invitations.split(/[,;\s]+/).filter(Boolean)
      if (addresses.some(value => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) { toast('Endereço de convite inválido', 'invitations'); return }
      if (!preview) live.invite(addresses)
      go('updates')
    }
    if (draft.step === 'updates') { if (preview) setNotice('Pré-visualização concluída'); else setFinishing(true) }
  }
  // Restored/OAuth flows may return to email, and an existing identity can still
  // need setup. Count the screens in the current phase, not a stale entry path.
  const authenticating = draft.step === 'email' || draft.step === 'code'
  const flow = authenticating
    ? flows[draft.returning ? 'returning' : 'email']
    : flows[draft.returning || draft.provider === 'google' ? 'google' : 'email']
  const progress = flow.indexOf(draft.step)
  const [settled, setSettled] = useState<Step[]>([])
  const previousStep = useRef(draft.step)
  useEffect(() => {
    const left = previousStep.current
    previousStep.current = draft.step
    if (flow.indexOf(draft.step) > flow.indexOf(left)) setSettled(list => list.includes(left) ? list : [...list, left])
  }, [draft.step, flow])
  useEffect(() => { setSettled([]) }, [draft.email])
  // A screen already answered does not have to be answered twice: a step ahead is reachable when
  // every screen before it is either behind us or already carries its value. The code and the
  // password never reach the draft, so they count only while their value is still typed.
  const filled: Record<Step, boolean> = {
    start: true, join: false,
    code: code.length === 6,
    password: password.length >= 8,
    email: !!draft.email.trim(),
    workspace: !!draft.name.trim() && (preview || live.canSaveProfile),
    profile: !!draft.profile.trim(),
    invites: true, updates: true,
  }
  // Leaving a screen forwards means it was accepted, so it stays settled: coming back and clearing
  // the field never re-locks the road ahead, and nothing here waits on a save still in flight.
  const answered = (step: Step) => settled.includes(step) || filled[step]
  const reachable = (i: number) => i !== progress
    && (preview || !['email', 'code', 'password'].includes(flow[i]))
    && (preview || flow[i] !== 'workspace' || live.canEditWorkspace)
    && (preview || flow[i] !== 'invites' || live.canInvite)
    && flow.slice(0, i).every((step, j) => j < progress || answered(step))
  // The mark anchors the stage: it holds its place while each step's panel grows below it.
  const brand = preview ? <a className="ob-brand" href="/onboarding-preview" onClick={e => { e.preventDefault(); go('start') }} aria-label="Fontes, início"><img src="/mark.png" width="36" height="36" alt=""/></a> : <span className="ob-brand"><img src="/mark.png" width="36" height="36" alt="Fontes"/></span>
  const invitationFailures = live.invitationErrors.length > 0 && <div role="status">{live.invitationErrors.map(item => <div key={item.token}><p>{item.email}: {item.error}</p><button type="button" onClick={() => live.retryInvitation(item.token)}>Reenviar</button><button type="button" onClick={() => live.retryInvitation(item.token, true)}>Remover convite</button></div>)}</div>
  if (background) return live.failed || live.invitationErrors.length ? <div className="ob-sync-status" role="status">
    {error?.text || 'Alterações guardadas neste dispositivo. A sincronização será retomada.'}
    {live.failed && <button type="button" onClick={live.retry}>Tentar novamente</button>}{invitationFailures}
  </div> : null
  if (!screenShown.current) return <OnboardingLayout pending />
  return <OnboardingLayout brand={brand} progress={<div className="ob-progress-transition" data-loading={live.googleActive}><span className="ob-google-spinner" role="status" aria-label="Ligação ao Google em curso" aria-hidden={!live.googleActive}/>{(!draft.returning || !authenticating) && progress >= 0 && <nav className="ob-progress" aria-hidden={live.googleActive} aria-label={`Passo ${progress + 1} de ${flow.length}`}>{flow.map((step, i) => <button key={step} type="button" className={i === progress ? 'current' : i < progress ? 'past' : ''} aria-label={labels[steps.indexOf(step)]} aria-current={i === progress ? 'step' : undefined} disabled={live.googleActive || !reachable(i)} onClick={() => go(step)}/>)}</nav>}</div>} footer={preview && <aside className="ob-preview-bar" aria-label="Controlos da pré-visualização"><span>Pré-visualização</span><nav aria-label="Ecrãs">{steps.map((step, i) => <button key={step} aria-current={draft.step === step ? 'step' : undefined} onClick={() => go(step)}>{labels[i]}</button>)}</nav><button className="ob-reset" onClick={() => { setDraft(fresh); setCode(''); setNotice(''); setError(null); setFieldError(null) }}>Reiniciar</button></aside>}>
      <StepPanel step={draft.step}>
        <header className="ob-step-heading"><h1 id="ob-title" tabIndex={-1}>{titles[draft.step]}</h1>{descriptions[draft.step] && <p>{descriptions[draft.step]}</p>}</header>
        <div className="ob-step-content" key={draft.step}>
        {draft.step === 'start' ? <div className="ob-start-actions">
          <button className="ob-button ob-provider" disabled={live.busy || live.restoring} onClick={() => { patch({ provider: 'google' }); if (!preview) { void live.google(); return }; patch({ email: 'mateus@gmail.com', profile: 'Mateus', returning: false }); go('workspace') }}><Google/>Continuar com Google</button>
          <div className="ob-divider"><span>ou</span></div>
          <button className="ob-button ob-provider" disabled={live.busy || live.restoring} onClick={() => { patch({ provider: 'email' }); if (!preview) { void live.changeEmail(); return }; patch({ returning: false }); go('email') }}><Icon kind="email"/>Continuar com email</button>
          <p className="ob-account">Conta criada? <button className="ob-link" disabled={live.busy || live.restoring} onClick={() => { patch({ returning: true, provider: 'email' }); go('email') }}>Entrar</button></p>
        </div> : <form onSubmit={submit} noValidate onInput={clearFieldError}>
          {draft.step === 'email' && <><Field label="Endereço de email" name="email" error={fieldMessage('email')}><input {...fieldProps('email')} aria-label="Endereço de email" type="email" autoComplete="email" placeholder="Endereço de email" required maxLength={254} value={draft.email} onChange={e => patch({ email: e.target.value })}/></Field>{draft.returning && <PasswordField existing name="oldPassword" aside={<a className="ob-subtle ob-password-recovery" href={recoveryURL()}>Recuperar acesso<Icon kind="arrow"/></a>} error={fieldMessage('oldPassword')} value={password} onChange={setPassword}/>}<button disabled={live.busy || live.restoring} className="ob-button ob-primary ob-wide">{draft.returning ? 'Iniciar sessão' : 'Continuar com email'}</button>{draft.returning && <><div className="ob-divider"><span>ou</span></div><button type="button" className="ob-button ob-provider" disabled={live.busy || live.restoring} onClick={() => { if (!preview) { void live.google(); return }; setNotice('Pré-visualização concluída') }}><Google/>Continuar com Google</button></>}<p className="ob-account">{draft.returning ? 'Sem acesso?' : 'Conta criada?'} <button type="button" className="ob-link" disabled={live.busy || live.restoring} onClick={() => { patch({ returning: !draft.returning, provider: 'email' }); go('email') }}>{draft.returning ? 'Criar conta' : 'Entrar'}</button></p></>}
          {draft.step === 'code' && <><div className="ob-code-field"><div className="ob-code-head"><label htmlFor="ob-code-input">Código temporário</label><button type="button" className="ob-subtle ob-code-resend" disabled={live.busy || live.restoring} onClick={() => preview ? setNotice('Novo código enviado') : void live.start()}>Reenviar código<Icon kind="arrow"/></button></div><div className="ob-field"><input {...fieldProps('code')} id="ob-code-input" className="ob-code" inputMode="numeric" autoComplete="one-time-code" placeholder="Introduzir código" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}/><FieldError id="ob-code-error" message={fieldMessage('code')} hint="O email pode ter sido entregue na pasta de spam." hintId="ob-code-hint"/></div></div><button disabled={live.busy || live.restoring} className="ob-button ob-primary ob-wide">Continuar com código</button><div className="ob-account-note"><p>Código para <span>{email}</span></p><button type="button" className="ob-subtle" onClick={() => { if (!preview) { void live.changeEmail(); return }; patch({ returning: false, provider: 'email' }); go('email') }}>Utilizar um email diferente</button></div></>}
          {draft.step === 'password' && <><PasswordField meter name="password" error={fieldMessage('password')} value={password} onChange={setPassword}/><button disabled={password.length < 8 || (!preview && live.savingPassword)} className="ob-button ob-primary ob-wide">Guardar palavra-passe</button><button className="ob-subtle" type="button" onClick={() => void live.changeEmail()}>Utilizar um email diferente</button></>}
          {draft.step === 'join' && <div className="ob-start-actions">
            <button disabled={live.loading} className="ob-button ob-primary ob-wide">Tentar ligação novamente</button>
            <div className="ob-divider"><span>ou</span></div>
            <button type="button" className="ob-button ob-provider" onClick={() => preview ? go('workspace') : void live.dismissInvite()}>Continuar sem convite</button>
          </div>}
          {draft.step === 'workspace' && <><Field label="Nome" name="name" error={fieldMessage('name')}><input {...fieldProps('name')} aria-label="Nome" placeholder="Nome do ambiente de trabalho" autoComplete="organization" required maxLength={80} value={draft.name} onChange={e => patch({ name: e.target.value, slug: slug(e.target.value) })}/></Field><button className="ob-button ob-primary ob-wide" disabled={!preview && !live.canCreateWorkspace}>Criar ambiente</button><div className="ob-account-note"><p>Ambiente para <span>{email}</span></p><button type="button" className="ob-subtle" onClick={() => { if (!preview) { void live.changeEmail(); return }; patch({ returning: false, provider: 'email' }); go('email') }}>Utilizar um email diferente</button></div></>}
          {draft.step === 'profile' && <><div className="ob-field"><span>Imagem e nome</span><div className="ob-profile-input"><div className="ob-photo-slot"><button type="button" className="ob-photo" aria-label="Carregar imagem de perfil" onClick={() => file.current?.click()}>{draft.image ? <img className="ob-avatar" src={draft.image} alt=""/> : <Avatar seed={draft.email || 'fontes'}/>}<span className="ob-photo-hint" aria-hidden="true"><Icon kind="camera"/></span></button>{draft.image && <button type="button" className="ob-photo-clear" aria-label="Remover imagem" onClick={() => { imageGeneration.current++; setImagePending(false); patch({ image: '' }) }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>}</div><input {...fieldProps('profile')} aria-label="Nome do perfil" placeholder="Nome de perfil" autoComplete="name" required maxLength={80} value={draft.profile} onChange={e => patch({ profile: e.target.value })}/></div><FieldError id="ob-profile-error" message={fieldMessage('profile')}/><input ref={file} type="file" accept="image/*" hidden onChange={pickImage}/></div><button disabled={!preview && !live.canSaveProfile} className="ob-button ob-primary ob-wide">Continuar</button><div className="ob-account-note"><p>Ambiente para <span>{email}</span></p><button type="button" className="ob-subtle" onClick={() => { if (!preview) { void live.changeEmail(); return }; patch({ returning: false, provider: 'email' }); go('email') }}>Utilizar um email diferente</button></div></>}
          {draft.step === 'invites' && <>
            <div className="ob-invite-card">
              <button className="ob-copy ob-invite-link" type="button" onClick={() => preview ? setNotice('Link de convite disponível com o ambiente ligado à API') : void live.copyInvite()}><Icon kind="link"/>Copiar link</button>
              <label className="ob-field"><textarea {...fieldProps('invitations')} aria-label="Emails dos membros" placeholder="nome@equipa.pt, outro@equipa.pt" rows={2} value={draft.invitations} onChange={e => patch({ invitations: commas(e.target.value) })}/></label>
              <div className="ob-invite-hint"><FieldError id="ob-invitations-error" message={fieldMessage('invitations')} hint="Emails separados por vírgulas." hintId="ob-invitations-hint"/><button type="button" className="ob-subtle ob-skip" onClick={() => go('updates')}>Saltar<Icon kind="arrow"/></button></div>
              <button className="ob-button ob-primary ob-wide">{draft.invitations.trim() ? 'Enviar convite por email' : 'Continuar'}</button>
            </div>
          </>}

          {draft.step === 'updates' && <><div className="ob-preferences">{([{ key: 'changelog', title: 'Novidades da Fontes', text: 'Email semanal com novas funcionalidades e atualizações.' }, { key: 'daily', title: 'Resumos diários', text: 'Receber resumos diários curados pela equipa da Fontes.' }] as const).map(item => <label className="ob-preference" key={item.key}><span><strong>{item.title}</strong><small>{item.text}</small></span><input type="checkbox" role="switch" checked={draft[item.key]} onChange={e => patch({ [item.key]: e.target.checked })}/></label>)}</div><div className="ob-actions"><button className="ob-button ob-primary" disabled={finishing && !live.failed}>Começar<Icon kind="arrow"/></button></div></>}
          {draft.step === 'invites' && live.inviteLink && <input aria-label="Link de convite" readOnly value={live.inviteLink} onFocus={e => e.target.select()} />}
          {invitationFailures}
          {draft.step === 'invites' && <><div className="ob-account-note"><p>Ambiente para <span>{email}</span></p><button type="button" className="ob-subtle" onClick={() => { if (!preview) { void live.changeEmail(); return }; patch({ returning: false, provider: 'email' }); go('email') }}>Utilizar um email diferente</button></div></>}
          {draft.step === 'updates' && <><div className="ob-account-note"><p>Ambiente para <span>{email}</span></p><button type="button" className="ob-subtle" onClick={() => { if (!preview) { void live.changeEmail(); return }; patch({ returning: false, provider: 'email' }); go('email') }}>Utilizar um email diferente</button></div></>}
        </form>}
        {!preview && live.failed && <div className="ob-actions"><button className="ob-subtle" onClick={live.retry}>Tentar novamente</button><button className="ob-subtle" onClick={() => void live.changeEmail()}>Utilizar um email diferente</button></div>}
        {!preview && live.issue && live.issue !== draft.step && <form className="ob-correction" aria-label="Correção da configuração" noValidate onInput={clearFieldError} onSubmit={event => {
          event.preventDefault()
          if (!validate(event.currentTarget)) return
          if (live.issue === 'code') void live.verify(code)
          else if (live.issue === 'password') { live.setPassword(password); setPassword('') }
          else live.save(false, live.issue === 'workspace')
        }}>
          <h2>{live.issue === 'code' ? 'Confirmar email' : live.issue === 'password' ? 'Confirmar palavra-passe' : 'Corrigir configuração'}</h2>
          {live.issue === 'code' && <><Field label="Código de confirmação" name="code" error={fieldMessage('code')}><input {...fieldProps('code')} aria-label="Código de confirmação" placeholder="Código de seis dígitos" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}/></Field><button type="button" className="ob-subtle" disabled={live.busy || live.restoring} onClick={() => void live.start()}>Reenviar código</button></>}
          {live.issue === 'password' && <PasswordField name="password" error={fieldMessage('password')} value={password} onChange={setPassword}/>}
          {live.issue === 'workspace' && <Field label="Nome" name="name" error={fieldMessage('name')}><input {...fieldProps('name')} aria-label="Nome" required maxLength={80} value={draft.name} onChange={event => patch({ name: event.target.value, slug: slug(event.target.value) })}/></Field>}
          {live.issue === 'profile' && <Field label="Nome de perfil" name="profile" error={fieldMessage('profile')}><input {...fieldProps('profile')} aria-label="Nome do perfil a corrigir" required maxLength={80} value={draft.profile} onChange={event => patch({ profile: event.target.value })}/></Field>}
          <button className="ob-button ob-primary ob-wide" disabled={live.busy || (live.issue === 'password' && live.savingPassword)}>Confirmar correção</button>
        </form>}
        {live.googleActive && <p className="ob-notice" role="status">Início de sessão em curso na janela Google. <button type="button" className="ob-link" onClick={live.cancelGoogle}>Cancelar</button></p>}
        </div>
      </StepPanel>
      {(error || notice) && <div className="ob-toasts">
        {error && <Toast key={`error-${error.n}`} message={error.text} error onDismiss={() => setError(null)}/>}
        {notice && <Toast key={notice} message={notice} onDismiss={() => setNotice('')}/>}
      </div>}
  </OnboardingLayout>
}
