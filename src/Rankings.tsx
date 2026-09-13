import { useEffect, useMemo, useState } from 'react'
import { Building2, MapPin, MoreHorizontal, Tags, UserRound, UsersRound } from 'lucide-react'
import { API } from './api'
import type { AuthSession } from './auth'
import { Sparkline } from './components/Sparkline'
import './Rankings.css'

type Item = { id: number; name: string; count: number; previous_count: number; growth_percent: number | null; activity: number[]; kind?: 'person' | 'org' | 'location' }
type Lists = { writers: Item[]; categories: Item[]; mentions: Item[] }
const columns = [
  { key: 'writers', title: 'Autores', unit: 'artigos', icon: UserRound },
  { key: 'categories', title: 'Categorias', unit: 'artigos', icon: Tags },
  { key: 'mentions', title: 'Entidades', unit: 'eventos', icon: UsersRound },
] as const
const number = new Intl.NumberFormat('pt-PT')
const periods = [{ days: 1, label: '24 h' }, { days: 7, label: '7 dias' }, { days: 30, label: '30 dias' }]

function validLists(value: unknown): value is Lists {
  if (!value || typeof value !== 'object') return false
  return columns.every(({ key }) => {
    const list: unknown = (value as Record<string, unknown>)[key]
    return Array.isArray(list) && list.length <= 10 && list.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false
      const row = item as Partial<Item>
      return Number.isSafeInteger(row.id) && typeof row.name === 'string' && Number.isSafeInteger(row.count) && Number(row.count) > 0
        && Number.isSafeInteger(row.previous_count) && Number(row.previous_count) >= 0
        && (row.growth_percent === null ? row.previous_count === 0 : typeof row.growth_percent === 'number' && Number.isFinite(row.growth_percent))
        && Array.isArray(row.activity) && row.activity.length === 24 && row.activity.every(n => Number.isSafeInteger(n) && n >= 0)
    })
  })
}

const cacheLifetime = 5 * 60 * 1000
function readCache(key: string): { savedAt: number; lists: Lists } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
    const age = Date.now() - saved?.savedAt
    return Number.isFinite(age) && age >= 0 && age < 86400000 && validLists(saved?.lists) ? saved : null
  } catch { return null }
}

function saveCache(key: string, lists: Lists | null) {
  try {
    if (lists) localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), lists }))
    else localStorage.removeItem(key)
  } catch { /* Rankings remain available when browser storage is unavailable. */ }
}

type LoadRankings = (days: number) => Promise<Lists | null>

function createLoader(token: string | undefined, cachePrefix: string) {
  const requests = new Map<number, { promise: Promise<Lists | null>; controller: AbortController }>()
  const load: LoadRankings = days => {
    if (!token) return Promise.resolve(null)
    const cacheKey = `${cachePrefix}:${days}`
    const cached = readCache(cacheKey)
    if (cached && Date.now() - cached.savedAt < cacheLifetime) return Promise.resolve(cached.lists)
    const running = requests.get(days)
    if (running) return running.promise
    const controller = new AbortController()
    const until = Math.floor(Date.now() / 1000) - 1
    const params = new URLSearchParams({
      from: new Date((until - days * 86400) * 1000).toISOString(),
      until: new Date(until * 1000).toISOString(), limit: '10', sort: 'volume',
    })
    const promise = (async () => {
      try {
        const response = await fetch(`${API}/api/rankings?${params}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
        })
        controller.signal.throwIfAborted()
        if (response.status === 401 || response.status === 403) {
          saveCache(cacheKey, null)
          return null
        }
        if (!response.ok) throw new Error('Não foi possível obter os destaques.')
        const data: unknown = await response.json()
        if (!validLists(data)) throw new Error('Os destaques recebidos não estão disponíveis.')
        controller.signal.throwIfAborted()
        saveCache(cacheKey, data)
        return data
      } finally {
        if (requests.get(days)?.controller === controller) requests.delete(days)
      }
    })()
    requests.set(days, { promise, controller })
    return promise
  }
  return { load, dispose() { requests.forEach(request => request.controller.abort()); requests.clear() } }
}

export default function Rankings({ session }: { session: AuthSession | null }) {
  const token = session?.user.emailVerified ? session.session.token : undefined
  const [days, setDays] = useState(7)
  const cachePrefix = `fontes:rankings:v1:${API}:${session?.user.id}`
  const cacheKey = `${cachePrefix}:${days}`
  const loader = useMemo(() => createLoader(token, cachePrefix), [token, cachePrefix])
  useEffect(() => () => loader.dispose(), [loader])
  return token ? <section className="home-rankings" aria-label="Destaques">
    <div className="home-ranking-periods" role="group" aria-label="Período dos destaques">
      {periods.map(period => <button key={period.days} type="button" aria-pressed={days === period.days}
        onClick={() => setDays(period.days)}>{period.label}</button>)}
    </div>
    <RankingsContent key={`${token}:${cacheKey}`} token={token} days={days} cacheKey={cacheKey} loadRankings={loader.load} />
  </section> : null
}

function RankingsContent({ token, days, cacheKey, loadRankings }: { token: string; days: number; cacheKey: string; loadRankings: LoadRankings }) {
  const [lists, setLists] = useState<Lists | null>(() => readCache(cacheKey)?.lists ?? null)
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(true)
  const [expanded, setExpanded] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const prefetch = () => { void Promise.allSettled(periods.filter(period => period.days !== days).map(period => loadRankings(period.days))) }
    const cached = readCache(cacheKey)
    if (cached && Date.now() - cached.savedAt < cacheLifetime) {
      prefetch()
      setPending(false)
      retryTimer = setTimeout(() => setAttempt(value => value + 1), cacheLifetime - (Date.now() - cached.savedAt))
      return () => clearTimeout(retryTimer)
    }
    async function load() {
      setPending(true)
      try {
        const data = await loadRankings(days)
        if (controller.signal.aborted) return
        if (!data) { setLists(null); return }
        if (!controller.signal.aborted) {
          setLists(data)
          prefetch()
          retryTimer = setTimeout(() => setAttempt(value => value + 1), cacheLifetime)
        }
      } catch {
        if (!controller.signal.aborted) retryTimer = setTimeout(() => setAttempt(value => value + 1), 30000)
      } finally { if (!controller.signal.aborted) setPending(false) }
    }
    void load()
    return () => { controller.abort(); clearTimeout(retryTimer) }
  }, [token, days, cacheKey, attempt, loadRankings])

  return <div aria-busy={pending || !lists}>
    <div className="home-rankings-grid">
      {columns.map(({ key, title, unit, icon: Icon }) => {
        const all = lists?.[key] ?? []
        const showAll = expanded.includes(key)
        return <section className="home-ranking-column" key={key} aria-labelledby={`ranking-${key}`}>
          <header className="home-ranking-heading">
            <h2 id={`ranking-${key}`}>{title}</h2>
            {all.length > 5 && <button type="button" className="home-ranking-more"
              aria-label={`${showAll ? 'Mostrar menos' : 'Mostrar mais'}: ${title}`} aria-expanded={showAll} aria-controls={`ranking-list-${key}`}
              onClick={() => setExpanded(current => showAll ? current.filter(value => value !== key) : [...current, key])}>
              <MoreHorizontal size={16} aria-hidden="true" />
            </button>}
          </header>
          {!lists ? <div className="home-ranking-loading" role="status" aria-label={`A carregar: ${title}`}>
            {Array.from({ length: 5 }, (_, index) => <div className="home-ranking-placeholder" key={index}><span /><span /></div>)}
          </div> : all.length ? <ol id={`ranking-list-${key}`} className="home-ranking-list">
            {all.slice(0, showAll ? 10 : 5).map(item => {
              const RowIcon = key === 'mentions' ? item.kind === 'location' ? MapPin : item.kind === 'org' ? Building2 : UserRound : Icon
              const change = item.activity[item.activity.length - 1] - item.activity[0]
              const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
              const trendLabel = change > 0 ? 'Atividade final superior à inicial.' : change < 0 ? 'Atividade final inferior à inicial.' : 'Atividade final igual à inicial.'
              return <li key={item.id} className="home-ranking-row">
                <RowIcon size={18} strokeWidth={1.5} aria-hidden="true" />
                <span className="home-ranking-name" title={item.name}>{item.name}</span>
                <span className={`home-ranking-trend is-${direction}`}
                  role="img" aria-label={`${number.format(item.count)} ${unit} no período de ${days === 1 ? '24 horas' : `${days} dias`}. ${trendLabel}`}
                  title={`${number.format(item.count)} ${unit} recolhidos no período selecionado. ${trendLabel}`}>
                  <Sparkline values={item.activity} width={56} height={20} area strokeWidth={1.5} curve />
                  <span className="home-ranking-count" aria-hidden="true">{number.format(item.count)}</span>
                </span>
              </li>
            })}
          </ol> : <p className="home-ranking-empty">Sem resultados neste período.</p>}
        </section>
      })}
    </div>
  </div>
}
