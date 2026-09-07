import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react'
import './Onboarding.css'
import { type AuthSession } from './auth'
import { createAvatar, type Style } from '@dicebear/core'
import { adventurerNeutral, avataaarsNeutral, bigEarsNeutral, botttsNeutral, croodlesNeutral, loreleiNeutral, notionistsNeutral, pixelArtNeutral, thumbs } from '@dicebear/collection'
import { useOnboardingSync } from './useOnboardingSync'
import type { Bootstrap } from './onboardingSync'

export type Step = 'start' | 'email' | 'code' | 'workspace' | 'profile' | 'invites' | 'updates'
export type Draft = { step: Step; returning: boolean; provider: 'email' | 'google'; email: string; name: string; slug: string; slugEdited: boolean; profile: string; image: string; invitations: string; changelog: boolean; daily: boolean }
const key = 'fontes:onboarding-ui-preview:v1'
const steps: Step[] = ['start', 'email', 'code', 'workspace', 'profile', 'invites', 'updates']
const labels = ['Início', 'Email', 'Código', 'Ambiente', 'Perfil', 'Convites', 'Atualizações']
// Each entry path counts only the screens it actually shows: Google skips the email hand-off,
// and a returning profile just confirms its identity.
const flows: Record<'email' | 'google' | 'returning', Step[]> = { email: ['email', 'code', 'workspace', 'profile', 'invites', 'updates'], google: ['workspace', 'profile', 'invites', 'updates'], returning: ['email', 'code'] }
const fresh: Draft = { step: 'start', returning: false, provider: 'email', email: '', name: '', slug: '', slugEdited: false, profile: '', image: '', invitations: '', changelog: false, daily: false }
// A draft stored before a field existed still opens: the saved values sit on top of the
// defaults, so only the keys it does carry have to match.
function saved(value: unknown): Draft | null {
  const draft = value as Partial<Draft> | null
  if (!draft || !steps.includes(draft.step as Step)) return null
  if (!Object.keys(fresh).every(k => draft[k as keyof Draft] === undefined || typeof draft[k as keyof Draft] === typeof fresh[k as keyof Draft])) return null
  return { ...fresh, ...draft }
}
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
    if (value) return { ...value, step: !session && !['start', 'email', 'code'].includes(value.step) ? 'code' : value.step }
  } catch { /* No saved draft. */ }
  return initial
}
function slug(value: string) {
  const base = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
  return !base ? 'equipa' : base.length < 3 ? `${base}-equipa` : base
}
function Icon({ kind }: { kind: 'email' | 'link' | 'arrow' | 'camera' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === 'camera' ? <><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1 1 0 0 0 .8-.4l.9-1.2a1 1 0 0 1 .8-.4h5.6a1 1 0 0 1 .8.4l.9 1.2a1 1 0 0 0 .8.4h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/><circle cx="12" cy="12.5" r="3.4"/></> : kind === 'email' ? <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></> : kind === 'link' ? <><path d="m10 13 4-4m-6 5-1 1a3.5 3.5 0 0 0 5 5l4-4a3.5 3.5 0 0 0 0-5m0-1 1-1a3.5 3.5 0 0 0-5-5l-4 4a3.5 3.5 0 0 0 0 5"/></> : <path d="m9 5 7 7-7 7"/>}</svg>
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
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="ob-field"><span>{label}</span>{children}</label> }

function StepPanel({ step, children }: { step: Step; children: ReactNode }) {
  const present = useIsPresent()
  const reducedMotion = useReducedMotion()
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (present) panel.current?.querySelector<HTMLHeadingElement>('h1')?.focus({ preventScroll: true })
  }, [present])
  return <motion.section ref={panel} className={`ob-panel ob-${step}`} aria-labelledby="ob-title"
    inert={!present} aria-hidden={!present}
    initial={{ opacity: reducedMotion ? 1 : 0 }}
    animate={{ opacity: 1, transition: { duration: reducedMotion ? 0 : .16, ease: 'easeOut' } }}
    exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : .12, ease: 'easeIn' } }}>
    {children}
  </motion.section>
}

/** Shared signup/onboarding screens; simulation is available only on the development preview route. */
export default function Onboarding({ preview = false, session = null, onReady, background = false }: { background?: boolean; preview?: boolean; session?: AuthSession | null; onReady?: (state: Bootstrap) => void }) {
  const [draft, setDraft] = useState(() => preview ? restore() : restorePending(session))
  const [light, setLight] = useState(() => !matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const systemTheme = matchMedia('(prefers-color-scheme: dark)')
    const update = () => setLight(!systemTheme.matches)
    update()
    systemTheme.addEventListener('change', update)
    return () => systemTheme.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (background) return
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const previousColor = themeColor?.content
    if (themeColor) themeColor.content = light ? '#ffffff' : '#101012'
    return () => { if (themeColor && previousColor) themeColor.content = previousColor }
  }, [light, background])
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  // Errors leave the form for the toast; the inline notice keeps the informational lines.
  // ponytail: one toast, the latest error replaces the last; a stack if two ever need to show together.
  const [error, setError] = useState<{ text: string; n: number } | null>(null)
  const toast = (text: string) => setError(prev => text ? { text, n: (prev?.n ?? 0) + 1 } : null)
  useEffect(() => { if (!error) return; const t = setTimeout(() => setError(null), 7000); return () => clearTimeout(t) }, [error])
  // The last save opens the workspace on its own, so the button only reports that it is running.
  const [finishing, setFinishing] = useState(false)
  const live = useOnboardingSync({ preview, session, draft, setDraft, setNotice, setError: toast, onReady })
  const file = useRef<HTMLInputElement>(null)
  const patch = (value: Partial<Draft>) => setDraft(current => ({ ...current, ...value }))
  const go = (step: Step) => { patch({ step }); setNotice(''); setError(null) }
  useEffect(() => { if (preview) { try { localStorage.setItem(key, JSON.stringify(draft)) } catch { /* In-memory fallback. */ } } }, [draft, preview])
  const email = draft.email || 'email@email.com'
  const titles: Record<Step, string> = { start: 'Criar conta', email: draft.returning ? 'Perfil existente' : 'Novo perfil', code: 'Email de confirmação', workspace: 'Novo ambiente de trabalho', profile: 'Customizar perfil', invites: 'Convidar membros', updates: 'Comunicados e atualizações' }
  const descriptions: Partial<Record<Step, ReactNode>> = {
    code: <>Foi enviado um email para <strong>{email}</strong> com código de login temporário.</>,
    workspace: 'Ambientes de trabalho estão desenhados para colaboração dentro de equipas.',
    profile: 'Nomes e imagens podem ser visíveis a outros utilizadores.',
    invites: 'Novos convites podem ser feitos a qualquer altura.',
  }
  // The picture is cropped square and redrawn at 160px before it goes anywhere: the draft is
  // carried in storage and in the setup payload, and a phone camera's original is megabytes.
  async function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 12_000_000) { toast('Imagem acima de 12 MB'); return }
    try {
      const source = await createImageBitmap(file)
      const side = Math.min(source.width, source.height)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 160
      const context = canvas.getContext('2d')
      if (!context) throw new Error('sem canvas')
      context.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, 160, 160)
      source.close()
      patch({ image: canvas.toDataURL('image/webp', 0.85) })
      setError(null)
    } catch { toast('Imagem ilegível') }
  }
  // The form is noValidate so an empty or malformed field raises the toast instead of the browser's bubble;
  // a field with a title (the slug) speaks for itself, the rest take the step's line.
  const required: Partial<Record<Step, string>> = { email: 'Endereço de email inválido', code: 'Código de seis dígitos em falta', workspace: 'Nome do ambiente em falta', profile: 'Nome de perfil em falta' }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalid = event.currentTarget.querySelector<HTMLInputElement>(':invalid')
    if (invalid) { toast(invalid.title || required[draft.step] || 'Campos por preencher'); return }
    if (!preview && draft.step === 'email') { void live.start(); return }
    if (!preview && draft.step === 'code') { live.verify(code); setCode(''); return }
    if (!preview && draft.step === 'workspace') { live.save(false, true); return }
    if (!preview && ['profile', 'updates'].includes(draft.step)) live.save(draft.step === 'updates')
    if (draft.step === 'email') { patch({ profile: draft.profile || draft.email.split('@')[0].replace(/[._-]+/g, ' ') }); go('code') }
    if (draft.step === 'code') { if (draft.returning) setNotice('Pré-visualização concluída'); else go('workspace') }
    if (draft.step === 'workspace') go('profile')
    if (draft.step === 'profile') go('invites')
    if (draft.step === 'invites') {
      const addresses = draft.invitations.split(/[,;\n]+/).map(v => v.trim()).filter(Boolean)
      if (addresses.some(value => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) { toast('Endereço de convite inválido'); return }
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
  // The mark anchors the stage: it holds its place while each step's panel grows below it.
  const brand = <a className="ob-brand" href={preview ? '/onboarding-preview' : '/'} onClick={e => { e.preventDefault(); if (preview) go('start'); else void live.changeEmail() }} aria-label="Fontes, início"><img src="/mark.png" width="36" height="36" alt=""/></a>
  if (background) return live.failed ? <div className="ob-sync-status" role="status">
    {error?.text || 'Alterações guardadas neste dispositivo. A sincronização será retomada.'}
    <button type="button" onClick={live.retry}>Tentar novamente</button>
  </div> : null
  return <main className="ob-page" data-theme={light ? 'light' : 'dark'}>
    <div className="make-background ob-background" aria-hidden="true">
      <div className="make-purple-blob">
        <div className="make-purple-blob-primary" />
        <div className="make-purple-blob-secondary" />
      </div>
      <div className="make-background-grid" />
    </div>
    <div className="ob-stage">
      {brand}
      <AnimatePresence mode="wait" initial={false}>
      <StepPanel key={draft.step} step={draft.step}>
        <header><h1 id="ob-title" tabIndex={-1}>{titles[draft.step]}</h1>{descriptions[draft.step] && <p>{descriptions[draft.step]}</p>}</header>
        {draft.step === 'start' ? <div className="ob-start-actions">
          <button className="ob-button ob-provider" disabled={live.busy} onClick={() => { patch({ provider: 'google' }); if (!preview) { void live.google(); return }; patch({ email: 'mateus@gmail.com', profile: 'Mateus', returning: false }); go('workspace') }}><Google/>Continuar com Google</button>
          <div className="ob-divider"><span>ou</span></div>
          <button className="ob-button ob-provider" onClick={() => { patch({ provider: 'email' }); if (!preview) { void live.changeEmail(); return }; patch({ returning: false }); go('email') }}><Icon kind="email"/>Continuar com email</button>
          <p className="ob-account">Conta já criada? <button className="ob-link" onClick={() => { patch({ returning: true, provider: 'email' }); go('email') }}>Login</button></p>
        </div> : <form onSubmit={submit} noValidate>
          {draft.step === 'email' && <>{draft.returning && <><button type="button" className="ob-button ob-provider" disabled={live.busy} onClick={() => { if (!preview) { void live.google(); return }; setNotice('Pré-visualização concluída') }}><Google/>Continuar com Google</button><div className="ob-divider"><span>ou</span></div></>}<input aria-label="Endereço de email" type="email" autoComplete="email" placeholder="Endereço de email" required maxLength={254} value={draft.email} onChange={e => patch({ email: e.target.value })}/><button disabled={live.busy} className="ob-button ob-primary ob-wide">{live.busy ? 'A enviar…' : 'Continuar com email'}</button><button className="ob-subtle ob-centered" type="button" onClick={() => go('start')}>Voltar ao início</button></>}
          {draft.step === 'code' && <><input className="ob-code" aria-label="Código de confirmação" inputMode="numeric" autoComplete="one-time-code" placeholder="Introduzir código" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}/><button className="ob-button ob-primary ob-wide">Continuar com código</button><button type="button" className="ob-subtle ob-resend" disabled={live.busy} onClick={() => preview ? setNotice('Novo código enviado, quaisquer seis dígitos servem nesta pré-visualização') : void live.start()}>Reenviar código</button><button type="button" className="ob-subtle ob-centered" onClick={() => go('start')}>Voltar ao início</button></>}
          {draft.step === 'workspace' && <><Field label="Nome"><input placeholder="Nome do ambiente de trabalho" autoComplete="organization" disabled={!preview && live.workspaceBusy} required maxLength={80} value={draft.name} onChange={e => patch({ name: e.target.value, slug: !draft.slugEdited ? slug(e.target.value) : draft.slug })}/></Field><Field label="URL"><div className="ob-url"><span>fontes.app/</span><input aria-label="URL do ambiente" disabled={!preview && live.workspaceBusy} placeholder="nome-da-equipa" pattern="[a-z0-9][a-z0-9\-]{2,47}" title="URL entre 3 e 48 letras minúsculas, números ou hífenes" required value={draft.slug} onChange={e => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''), slugEdited: true })}/></div></Field><button className="ob-button ob-primary ob-wide" disabled={!preview && (!live.canCreateWorkspace || live.workspaceBusy)}>{live.workspaceBusy ? 'A criar ambiente…' : 'Criar ambiente'}</button><div className="ob-account-note"><p>Ambiente para <span>{email}</span></p><button type="button" className="ob-subtle" onClick={() => { if (!preview) { void live.changeEmail(); return }; patch({ returning: false, provider: 'email' }); go('email') }}>Utilizar um email diferente</button></div></>}
          {draft.step === 'profile' && <><div className="ob-field"><span>Imagem e nome</span><div className="ob-profile-input"><div className="ob-photo-slot"><button type="button" className="ob-photo" aria-label="Carregar imagem de perfil" onClick={() => file.current?.click()}>{draft.image ? <img className="ob-avatar" src={draft.image} alt=""/> : <Avatar seed={draft.email || 'fontes'}/>}<span className="ob-photo-hint" aria-hidden="true"><Icon kind="camera"/></span></button>{draft.image && <button type="button" className="ob-photo-clear" aria-label="Remover imagem" onClick={() => patch({ image: '' })}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>}</div><input aria-label="Nome do perfil" placeholder="Nome de perfil" autoComplete="name" required maxLength={80} value={draft.profile} onChange={e => patch({ profile: e.target.value })}/></div><input ref={file} type="file" accept="image/*" hidden onChange={pickImage}/></div><button className="ob-button ob-primary ob-wide">Criar perfil</button><button type="button" className="ob-subtle ob-centered" onClick={() => go('workspace')}>Voltar</button></>}
          {draft.step === 'invites' && <><div className="ob-copy-row"><button className="ob-copy" type="button" onClick={() => go('updates')}>Saltar<Icon kind="arrow"/></button><button className="ob-copy" type="button" onClick={() => preview ? setNotice('Link de convite disponível com o ambiente ligado à API') : void live.copyInvite()}><Icon kind="link"/>Copiar link</button></div><Field label="Convites"><textarea aria-label="Emails dos membros" placeholder={'nome@equipa.pt\noutro@equipa.pt'} rows={3} value={draft.invitations} onChange={e => patch({ invitations: e.target.value })}/></Field><button className="ob-button ob-primary ob-wide">Enviar convite por email</button></>}
          {draft.step === 'updates' && <><div className="ob-preferences">{([{ key: 'changelog', title: 'Changelog', text: 'Email semanal com novas funcionalidades e atualizações.' }, { key: 'daily', title: 'Resumos diários', text: 'Receber resumos diários curados pela equipa da Fontes.' }] as const).map(item => <label className="ob-preference" key={item.key}><span><strong>{item.title}</strong><small>{item.text}</small></span><input type="checkbox" role="switch" checked={draft[item.key]} onChange={e => patch({ [item.key]: e.target.checked })}/></label>)}</div><div className="ob-actions"><button className="ob-button ob-primary" disabled={finishing && !live.failed}>{finishing && !live.failed ? 'A preparar…' : 'Começar'}<Icon kind="arrow"/></button></div></>}
          {!draft.returning && progress >= 0 && <div className="ob-progress" aria-label={`Passo ${progress + 1} de ${flow.length}`}>{Array.from({ length: flow.length }, (_, i) => <span key={i} className={i === progress ? 'current' : i < progress ? 'past' : ''}/>)}</div>}
          {(draft.step === 'invites' || draft.step === 'updates') && <button type="button" className="ob-subtle ob-centered" onClick={() => go(draft.step === 'updates' ? 'invites' : 'profile')}>Voltar</button>}
          {notice && <p className="ob-notice" role="status">{notice}</p>}
        </form>}
        {!preview && notice && draft.step === 'start' && <p className="ob-notice" role="status">{notice}</p>}
        {!preview && live.failed && <div className="ob-actions"><button className="ob-subtle" onClick={live.retry}>Tentar novamente</button><button className="ob-subtle" onClick={() => go('workspace')}>Editar configuração</button></div>}
      </StepPanel>
      </AnimatePresence>
    </div>
    {error && <div className="ob-toast" role="alert" key={error.n}><span>{error.text}</span></div>}
    {preview && <aside className="ob-preview-bar" aria-label="Controlos da pré-visualização"><span>Pré-visualização</span><nav aria-label="Ecrãs">{steps.map((step, i) => <button key={step} aria-current={draft.step === step ? 'step' : undefined} onClick={() => go(step)}>{labels[i]}</button>)}</nav><button className="ob-reset" onClick={() => { setDraft(fresh); setCode(''); setNotice(''); setError(null) }}>Reiniciar</button></aside>}
  </main>
}
