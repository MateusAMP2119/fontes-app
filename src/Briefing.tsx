import { useEffect, useRef, useState } from 'react'
import { API } from './api'
import type { AuthSession } from './auth'
import { Button } from './components/ui/button'
import BriefingText, { BriefingSkeleton } from './BriefingText'
import BriefingActions from './BriefingActions'
import Reload from './components/briefing-icons/Reload'
import './Briefing.css'

type Summary = {
  text: string
  generation_id?: string
  generated_at: number
  period: { from: number; until: number }
  segments?: { text: string; story_id?: number }[]
  notes?: { code: string; text: string }[]
}
type Result = { briefing: Summary; stale?: boolean }
function validResult(value: unknown): value is Result {
  if (!value || typeof value !== 'object' || !('briefing' in value)) return false
  const b = value.briefing as Partial<Summary> | null
  return !!b && typeof b.text === 'string' && Number.isFinite(b.generated_at)
    && Number.isFinite(b.period?.from) && Number.isFinite(b.period?.until)
    && (b.generation_id === undefined || typeof b.generation_id === 'string')
    && (b.segments === undefined || (Array.isArray(b.segments) && b.segments.every(s => s && typeof s.text === 'string' && (s.story_id === undefined || Number.isSafeInteger(s.story_id)))))
    && (b.notes === undefined || (Array.isArray(b.notes) && b.notes.every(n => n && typeof n.code === 'string' && typeof n.text === 'string')))
}

function readCache(key?: string): Result | null {
  try {
    const saved: unknown = key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null
    return validResult(saved) ? saved : null
  } catch { return null }
}

function saveCache(key: string | undefined, result: Result | null) {
  if (!key) return
  try {
    if (result) localStorage.setItem(key, JSON.stringify(result))
    else localStorage.removeItem(key)
  } catch { /* Storage restrictions must not prevent reading the briefing. */ }
}

const date = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })

export default function Briefing({ session }: { session: AuthSession | null }) {
  const token = session?.user.emailVerified ? session.session.token : undefined
  const cacheKey = token && session?.user.id ? `fontes:briefing:v1:${API}:${session.user.id}` : undefined
  // Remount on identity changes so a previous session's content cannot linger.
  return <BriefingContent key={token ?? 'signed-out'} token={token} cacheKey={cacheKey} />
}

function BriefingContent({ token, cacheKey }: { token?: string; cacheKey?: string }) {
  const [cached] = useState(() => readCache(cacheKey))
  const [result, setResult] = useState<Result | null>(cached)
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState(!!token && !cached)
  const [error, setError] = useState('')
  const [authFailed, setAuthFailed] = useState(false)
  const request = useRef<AbortController | null>(null)

  async function load() {
    if (!token) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setError('')
    try {
      const response = await fetch(`${API}/api/briefing`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
        cache: 'no-store',
      })
      if (controller.signal.aborted) return
      if (response.status === 404) { setResult(null); saveCache(cacheKey, null); return }
      if (response.status === 401 || response.status === 403) {
        saveCache(cacheKey, null)
        setAuthFailed(true)
        setResult(null)
        throw new Error('É necessária uma sessão ativa com email confirmado para consultar o resumo.')
      }
      if (response.status === 409) throw new Error('Já existe um resumo em preparação. Nova tentativa disponível dentro de alguns segundos.')
      if (!response.ok) throw new Error('Não foi possível obter o resumo. Nova tentativa disponível.')
      const data: Result = await response.json()
      if (!validResult(data)) {
        throw new Error('O resumo recebido não está disponível. Nova tentativa disponível.')
      }
      if (!controller.signal.aborted) { setResult(data); saveCache(cacheKey, data); setRevision(value => value + 1) }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.name === 'Error' ? cause.message : 'Não foi possível obter o resumo. Nova tentativa disponível.')
    } finally {
      if (!controller.signal.aborted) setPending(false)
    }
  }

  useEffect(() => {
    if (!cached) void load()
    return () => request.current?.abort()
    // The parent remounts this component whenever the token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summary = result?.briefing
  return <section className="home-briefing" aria-label="Resumo do período" aria-busy={!!pending}>
    {!token && <p className="home-briefing-status">Resumo disponível com uma sessão ativa e email confirmado.</p>}
    {pending && !summary && <BriefingSkeleton />}
    {summary && <>
      <BriefingText key={revision} text={summary.text} segments={summary.segments} pending={pending} animate={!cached || revision > 0} />
      {summary.notes?.map(note => <p className="home-briefing-status" key={note.code}>{note.text}</p>)}
      <div className="home-briefing-footer">
        <div className="home-briefing-updated">
          <button type="button" className="home-briefing-refresh" data-loading={pending || undefined} aria-label="Atualizar resumo" title="Atualizar resumo" disabled={pending} onClick={() => void load()}>
            <Reload className="home-briefing-icon" aria-hidden="true" />
          </button>
          <p className="home-briefing-status">Atualizado a {date.format(summary.generated_at * 1000)}</p>
        </div>
        <BriefingActions key={summary.generation_id ?? summary.generated_at} text={summary.text} generationId={summary.generation_id} token={token!} />
      </div>
    </>}
    {token && !summary && !pending && !error && <p className="home-briefing-status">Ainda não existe um resumo disponível.</p>}
    {error && <div role="alert"><p className="home-briefing-status">{error}</p>
      {!authFailed && <Button variant="ghost" size="sm" disabled={!!pending} onClick={() => void load()}>Tentar novamente</Button>}
    </div>}
  </section>
}
