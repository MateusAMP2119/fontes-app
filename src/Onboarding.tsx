import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import './Onboarding.css'
import { type AuthSession } from './auth'
import { useOnboardingSync } from './useOnboardingSync'
import type { Bootstrap } from './onboardingSync'

export type Step = 'start' | 'email' | 'code' | 'workspace' | 'profile' | 'invites' | 'updates' | 'done'
export type Draft = { step: Step; returning: boolean; email: string; name: string; slug: string; profile: string; invitations: string; changelog: boolean; daily: boolean }
const key = 'fontes:onboarding-ui-preview:v1'
const steps: Step[] = ['start', 'email', 'code', 'workspace', 'profile', 'invites', 'updates', 'done']
const labels = ['Início', 'Email', 'Código', 'Ambiente', 'Perfil', 'Convites', 'Atualizações', 'Fim']
const fresh: Draft = { step: 'start', returning: false, email: '', name: '', slug: '', profile: '', invitations: '', changelog: false, daily: false }
function restore(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    if (value && steps.includes(value.step) && Object.keys(fresh).every(k => typeof value[k] === typeof fresh[k as keyof Draft])) return value
  } catch { /* Preview also works with storage disabled. */ }
  return fresh
}
function restorePending(session: AuthSession | null): Draft {
  const initial = { ...fresh, step: location.pathname === '/login' ? 'email' : 'start', returning: location.pathname === '/login' } as Draft
  try {
    const value = JSON.parse(sessionStorage.getItem('fontes:onboarding:v1:pending') || 'null')?.draft
    if (value && steps.includes(value.step) && Object.keys(fresh).every(k => typeof value[k] === typeof fresh[k as keyof Draft])) {
      return { ...value, step: !session && !['start', 'email', 'code'].includes(value.step) ? 'code' : value.step }
    }
  } catch { /* No saved draft. */ }
  return initial
}
function slug(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) }
function Icon({ kind }: { kind: 'email' | 'link' | 'arrow' | 'check' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === 'email' ? <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></> : kind === 'link' ? <><path d="m10 13 4-4m-6 5-1 1a3.5 3.5 0 0 0 5 5l4-4a3.5 3.5 0 0 0 0-5m0-1 1-1a3.5 3.5 0 0 0-5-5l-4 4a3.5 3.5 0 0 0 0 5"/></> : kind === 'check' ? <path d="m5 12 4 4L19 6"/> : <path d="m9 5 7 7-7 7"/>}</svg>
}
function Google() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.6Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.4-2.6Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>
}
function Avatar({ seed }: { seed: string }) {
  let hash = 7
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  const hue = Math.abs(hash) % 360
  return <svg className="ob-avatar" viewBox="0 0 64 64" role="img" aria-label="Imagem de perfil gerada"><rect width="64" height="64" fill={`hsl(${hue} 22% 19%)`}/>{Array.from({ length: 15 }, (_, i) => {
    const x = i % 3, y = Math.floor(i / 3)
    return ((hash >>> (i % 24)) & 1) ? <g key={i} fill={`hsl(${hue} 55% 69%)`}><rect x={12 + x * 8} y={12 + y * 8} width="8" height="8"/><rect x={44 - x * 8} y={12 + y * 8} width="8" height="8"/></g> : null
  })}</svg>
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="ob-field"><span>{label}</span>{children}</label> }

/** Shared signup/onboarding screens; simulation is available only on the development preview route. */
export default function Onboarding({ preview = false, session = null, onReady }: { preview?: boolean; session?: AuthSession | null; onReady?: (state: Bootstrap) => void }) {
  const [draft, setDraft] = useState(() => preview ? restore() : restorePending(session))
  const [light, setLight] = useState(() => {
    try { return localStorage.getItem('fontes:theme') === 'light' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('fontes:theme', light ? 'light' : 'dark') } catch { /* In-memory fallback. */ }
  }, [light])
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  const live = useOnboardingSync({ preview, session, draft, setDraft, setNotice, onReady })
  const title = useRef<HTMLHeadingElement>(null)
  const patch = (value: Partial<Draft>) => setDraft(current => ({ ...current, ...value }))
  const go = (step: Step) => { patch({ step }); setNotice('') }
  useEffect(() => { if (preview) { try { localStorage.setItem(key, JSON.stringify(draft)) } catch { /* In-memory fallback. */ } } }, [draft, preview])
  useEffect(() => { title.current?.focus() }, [draft.step])
  const email = draft.email || 'email@email.com'
  const titles: Record<Step, string> = { start: 'Criar conta', email: draft.returning ? 'Perfil existente' : 'Novo perfil', code: 'Email de confirmação', workspace: 'Criar novo ambiente de trabalho', profile: 'Customizar perfil', invites: 'Convidar membros', updates: 'Comunicados e atualizações', done: !preview && !live.ready ? 'A preparar o teu ambiente' : draft.returning ? 'Bem-vindo de volta' : 'Tudo pronto' }
  const descriptions: Partial<Record<Step, ReactNode>> = {
    code: <>Foi enviado um email para <strong>{email}</strong> com código de login temporário.</>,
    workspace: 'Ambientes de trabalho estão desenhados para colaboração dentro de equipas e partilha com membros externos, opcionalmente.',
    profile: 'Nomes e imagens podem ser visíveis a outros utilizadores.',
    invites: 'Novos convites podem ser feitos a qualquer altura.',
    done: !preview && !live.ready ? 'Podes continuar assim que a configuração estiver guardada.' : draft.returning ? 'O teu ambiente de trabalho está à tua espera.' : <>O ambiente <strong>{draft.name || 'Fontes'}</strong> está pronto para começar.</>,
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!preview && draft.step === 'email') { void live.start(); return }
    if (!preview && draft.step === 'code') { live.verify(code); setCode(''); return }
    if (!preview && ['workspace', 'profile', 'updates'].includes(draft.step)) live.save(draft.step === 'updates')
    if (draft.step === 'email') { patch({ profile: draft.profile || draft.email.split('@')[0].replace(/[._-]+/g, ' ') }); go('code') }
    if (draft.step === 'code') go(draft.returning ? 'done' : 'workspace')
    if (draft.step === 'workspace') go('profile')
    if (draft.step === 'profile') go('invites')
    if (draft.step === 'invites') {
      const addresses = draft.invitations.split(/[,;\n]+/).map(v => v.trim()).filter(Boolean)
      if (addresses.some(value => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) { setNotice('Confirma os endereços de email dos convites.'); return }
      if (!preview) live.invite(addresses)
      go('updates')
    }
    if (draft.step === 'updates') go('done')
  }
  const progress = ['code', 'workspace', 'profile', 'invites', 'updates'].indexOf(draft.step)
  // The mark heads the start screen and returns to it from every later step.
  const brand = <a className="ob-brand" href={preview ? '/onboarding-preview' : '/'} onClick={e => { e.preventDefault(); if (preview) go('start'); else void live.changeEmail() }} aria-label="Fontes, início"><img src="/mark.png" width="44" height="44" alt=""/></a>
  return <main className="ob-page" data-theme={light ? 'light' : 'dark'}>
    {draft.step !== 'start' && brand}
    <div className="ob-stage">
      <section className={`ob-panel ob-${draft.step}`} aria-labelledby="ob-title" key={draft.step}>
        {progress >= 0 && <div className="ob-progress" aria-label={`Passo ${progress + 1} de 5`}>{Array.from({ length: 5 }, (_, i) => <span key={i} className={i === progress ? 'current' : i < progress ? 'past' : ''}/>)}</div>}
        {draft.step === 'done' && <div className="ob-success"><Icon kind="check"/></div>}
        <header>{draft.step === 'start' && brand}<h1 id="ob-title" ref={title} tabIndex={-1}>{titles[draft.step]}</h1>{descriptions[draft.step] && <p>{descriptions[draft.step]}</p>}</header>
        {draft.step === 'start' ? <div className="ob-start-actions">
          <button className="ob-button ob-provider" disabled={live.busy} onClick={() => { if (!preview) { void live.google(); return }; patch({ email: 'mateus@gmail.com', profile: 'Mateus', returning: false }); go('workspace') }}><Google/>Continuar com Google</button>
          <div className="ob-divider"><span>ou</span></div>
          <button className="ob-button ob-provider" onClick={() => { if (!preview) { void live.changeEmail(); return }; patch({ returning: false }); go('email') }}><Icon kind="email"/>Continuar com email</button>
          <p className="ob-account">Conta já criada? <button className="ob-link" onClick={() => { patch({ returning: true }); go('email') }}>Login</button></p>
        </div> : draft.step === 'done' ? <><button className="ob-button ob-primary ob-wide" disabled={!preview && !live.ready} onClick={() => preview ? setNotice('Pré-visualização concluída.') : live.open()}>Abrir ambiente de trabalho<Icon kind="arrow"/></button>{notice && <p className="ob-notice" role="status">{notice}</p>}</> : <form onSubmit={submit}>
          {draft.step === 'email' && <><input aria-label="Endereço de email" type="email" autoComplete="email" placeholder="Introduzir endereço de email..." required maxLength={254} value={draft.email} onChange={e => patch({ email: e.target.value })}/><button disabled={live.busy} className="ob-button ob-primary ob-wide">{live.busy ? 'A enviar…' : 'Continuar com email'}</button><button className="ob-subtle ob-centered" type="button" onClick={() => go('start')}>Voltar ao início</button></>}
          {draft.step === 'code' && <><input className="ob-code" aria-label="Código de confirmação" inputMode="numeric" autoComplete="one-time-code" placeholder="Introduzir código" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}/><button className="ob-button ob-primary ob-wide">Continuar com código</button><div className="ob-code-links"><button type="button" className="ob-subtle" onClick={() => go('start')}>Voltar ao início</button><button type="button" className="ob-subtle" disabled={live.busy} onClick={() => preview ? setNotice('Novo código enviado. Nesta pré-visualização, utiliza quaisquer seis dígitos.') : void live.start()}>Reenviar código</button></div></>}
          {draft.step === 'workspace' && <><Field label="Nome"><input placeholder="Nome do ambiente de trabalho" autoComplete="organization" required maxLength={80} value={draft.name} onChange={e => patch({ name: e.target.value, slug: draft.slug === slug(draft.name) ? slug(e.target.value) : draft.slug })}/></Field><Field label="URL"><div className="ob-url"><span>app.fonteslabs.com/</span><input aria-label="URL do ambiente" placeholder="a-tua-equipa" pattern="[a-z0-9][a-z0-9\-]{2,47}" title="Entre 3 e 48 letras minúsculas, números ou hífenes." required value={draft.slug} onChange={e => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}/></div></Field><button className="ob-button ob-primary ob-wide">Criar ambiente</button><div className="ob-account-note"><p>Ambiente para <span>{email}</span></p><button type="button" className="ob-subtle" onClick={() => { if (!preview) { void live.changeEmail(); return }; patch({ returning: false }); go('email') }}>Utilizar um email diferente</button></div></>}
          {draft.step === 'profile' && <><Field label="Imagem e nome"><div className="ob-profile-input"><Avatar seed={draft.email || 'fontes'}/><input aria-label="Nome do perfil" placeholder="O teu nome" autoComplete="name" required maxLength={80} value={draft.profile} onChange={e => patch({ profile: e.target.value })}/></div></Field><div className="ob-actions"><button type="button" className="ob-subtle" onClick={() => go('workspace')}>Voltar</button><button className="ob-button ob-primary">Continuar</button></div></>}
          {draft.step === 'invites' && <><Field label="Convites"><textarea aria-label="Emails dos membros" placeholder={'nome@equipa.pt\noutro@equipa.pt'} rows={3} value={draft.invitations} onChange={e => patch({ invitations: e.target.value })}/></Field><button className="ob-copy" type="button" onClick={() => preview ? setNotice('O link de convite estará disponível quando o ambiente estiver ligado à API.') : void live.copyInvite()}><Icon kind="link"/>Copiar link para convite</button><div className="ob-actions"><button type="button" className="ob-subtle" onClick={() => go('profile')}>Voltar</button><div className="ob-action-group"><button type="button" className="ob-subtle" onClick={() => go('updates')}>Saltar</button><button className="ob-button ob-primary">{draft.invitations.trim() ? 'Enviar convites' : 'Continuar'}</button></div></div></>}
          {draft.step === 'updates' && <><div className="ob-preferences">{([{ key: 'changelog', title: 'Changelog', text: 'Email semanal com novas funcionalidades e atualizações.' }, { key: 'daily', title: 'Resumos diários', text: 'Receber resumos diários curados pela equipa da Fontes.' }] as const).map(item => <label className="ob-preference" key={item.key}><span><strong>{item.title}</strong><small>{item.text}</small></span><input type="checkbox" role="switch" checked={draft[item.key]} onChange={e => patch({ [item.key]: e.target.checked })}/></label>)}</div><div className="ob-actions"><button type="button" className="ob-subtle" onClick={() => go('invites')}>Voltar</button><button className="ob-button ob-primary">Começar<Icon kind="arrow"/></button></div></>}
          {notice && <p className="ob-notice" role="status">{notice}</p>}
        </form>}
        {!preview && notice && draft.step === 'start' && <p className="ob-notice" role="status">{notice}</p>}
        {!preview && live.failed && <div className="ob-actions"><button className="ob-subtle" onClick={live.retry}>Tentar novamente</button><button className="ob-subtle" onClick={() => go('workspace')}>Editar configuração</button></div>}
      </section>
    </div>
    <button className="ob-theme-toggle" type="button" role="switch" aria-checked={light} aria-label="Modo claro" title={light ? 'Ativar modo escuro' : 'Ativar modo claro'} onClick={() => setLight(value => !value)}>
      <span className="ob-theme-track"><span className="ob-theme-thumb"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg></span></span>
    </button>
    {preview && <aside className="ob-preview-bar" aria-label="Controlos da pré-visualização"><span>Pré-visualização</span><nav aria-label="Ecrãs">{steps.map((step, i) => <button key={step} aria-current={draft.step === step ? 'step' : undefined} onClick={() => go(step)}>{labels[i]}</button>)}</nav><button className="ob-reset" onClick={() => { setDraft(fresh); setCode(''); setNotice('') }}>Reiniciar</button></aside>}
  </main>
}
