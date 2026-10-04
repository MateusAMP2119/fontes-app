import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog } from 'radix-ui'
import { API } from './api'
import { retryRead } from './retryRead'
import { transitionView } from './viewTransition'
import type { AuthSession } from './auth'
import { Sparkline } from './components/Sparkline'
import './Rankings.css'

type Item = { id: number; name: string; count: number; previous_count: number; growth_percent: number | null; activity: number[]; kind?: 'person' | 'org' | 'location' }
type Lists = { writers: Item[]; categories: Item[]; mentions: Item[] }
const columns = [
  { key: 'writers', title: 'Autores', description: 'Autores e assinaturas com mais artigos recolhidos no período selecionado.', unit: 'artigos' },
  { key: 'categories', title: 'Categorias', description: 'Categorias com mais artigos recolhidos no período selecionado.', unit: 'artigos' },
  { key: 'mentions', title: 'Entidades', description: 'Pessoas, organizações e locais presentes em mais eventos no período selecionado.', unit: 'eventos' },
] as const
const number = new Intl.NumberFormat('pt-PT')
const periods = [{ days: 1, label: '24 h' }, { days: 7, label: '7 dias' }, { days: 30, label: '30 dias' }]

function validLists(value: unknown, limit = 10): value is Lists {
  if (!value || typeof value !== 'object') return false
  return columns.every(({ key }) => {
    const list: unknown = (value as Record<string, unknown>)[key]
    return Array.isArray(list) && list.length <= limit && list.every((item: unknown) => {
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

export default function Rankings({ session, days: selectedDays }: { session: AuthSession | null; days?: number }) {
  const token = session?.user.emailVerified ? session.session.token : undefined
  const [localDays, setDays] = useState(7)
  const days = selectedDays ?? localDays
  const cachePrefix = `fontes:rankings:v1:${API}:${session?.user.id}`
  const cacheKey = `${cachePrefix}:${days}`
  const loader = useMemo(() => createLoader(token, cachePrefix), [token, cachePrefix])
  useEffect(() => () => loader.dispose(), [loader])
  return token ? <section className="home-rankings" aria-label="Destaques">
    {selectedDays === undefined && <div className="home-ranking-periods" role="group" aria-label="Período dos destaques">
      {periods.map(period => <button key={period.days} type="button" aria-pressed={days === period.days}
        onClick={() => { if (days !== period.days) transitionView(() => setDays(period.days)) }}>{period.label}</button>)}
    </div>}
    <RankingsContent key={`${token}:${cacheKey}`} token={token} days={days} cacheKey={cacheKey} loadRankings={loader.load} />
  </section> : null
}

function RankingsContent({ token, days, cacheKey, loadRankings }: { token: string; days: number; cacheKey: string; loadRankings: LoadRankings }) {
  const [lists, setLists] = useState<Lists | null>(() => readCache(cacheKey)?.lists ?? null)
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(true)
  const [selected, setSelected] = useState<typeof columns[number] | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const prefetch = () => { void Promise.allSettled(periods.filter(period => period.days !== days)
      .map(period => retryRead(() => loadRankings(period.days), controller.signal))) }
    prefetch()
    const cached = readCache(cacheKey)
    if (cached && Date.now() - cached.savedAt < cacheLifetime) {
      setPending(false)
      retryTimer = setTimeout(() => setAttempt(value => value + 1), cacheLifetime - (Date.now() - cached.savedAt))
      return () => { controller.abort(); clearTimeout(retryTimer) }
    }
    async function load() {
      setPending(true)
      try {
        const data = await loadRankings(days)
        if (controller.signal.aborted) return
        if (!data) { setLists(null); retryTimer = setTimeout(() => setAttempt(value => value + 1), 30000); return }
        if (!controller.signal.aborted) {
          setLists(data)
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
      {columns.map(column => {
        const { key, title, unit } = column
        const all = lists?.[key] ?? []
        return <section className="home-ranking-column" key={key} aria-labelledby={`ranking-${key}`}>
          <header className="home-ranking-heading">
            <h2 id={`ranking-${key}`}>{title}</h2>

          </header>
          {!lists ? <div className="home-ranking-loading" role="status" aria-label={`A carregar: ${title}`}>
            {Array.from({ length: 5 }, (_, index) => <div className="home-ranking-placeholder" key={index}><span /><span /></div>)}
          </div> : all.length ? <ol id={`ranking-list-${key}`} className="home-ranking-list">
            {all.slice(0, 5).map(item => <RankingRow key={item.id} item={item} unit={unit} days={days} onOpen={event => { opener.current = event.currentTarget; setSelected(column) }} />)}
          </ol> : <p className="home-ranking-empty">Sem resultados neste período.</p>}
        </section>
      })}
    </div>
    <Dialog.Root open={selected !== null} onOpenChange={open => { if (!open) setSelected(null) }}>
      <Dialog.Overlay className="home-ranking-overlay" />
      <Dialog.Content className="home-ranking-dialog" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }}>
        {selected && <RankingPopup key={selected.key} column={selected} token={token} days={days} />}
      </Dialog.Content>
    </Dialog.Root>
  </div>
}

function RankingRow({ item, unit, days, position, onOpen }: {
  item: Item; unit: string; days: number; position?: number; onOpen?: React.MouseEventHandler<HTMLButtonElement>
}) {
  const change = item.activity[item.activity.length - 1] - item.activity[0]
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
  const trendLabel = change > 0 ? 'Atividade final superior à inicial.' : change < 0 ? 'Atividade final inferior à inicial.' : 'Atividade final igual à inicial.'
  const content = <>
    {position !== undefined && <span className="home-ranking-position">{position}</span>}
    <span className="home-ranking-name" title={item.name}>{item.name}</span>
    <span className={`home-ranking-trend is-${direction}`}
      role="img" aria-label={`${number.format(item.count)} ${unit} no período de ${days === 1 ? '24 horas' : `${days} dias`}. ${trendLabel}`}
      title={`${number.format(item.count)} ${unit} recolhidos no período selecionado. ${trendLabel}`}>
      <Sparkline values={item.activity} width={56} height={20} area strokeWidth={1.5} curve />
      <span className="home-ranking-count" aria-hidden="true">{number.format(item.count)}</span>
    </span>
  </>
  return <li className={onOpen ? 'home-ranking-clickable' : 'home-ranking-row'}>
    {onOpen ? <button type="button" className="home-ranking-row home-ranking-row-button" onClick={onOpen} aria-haspopup="dialog">{content}</button> : content}
  </li>
}

function RankingPopup({ column, token, days }: { column: typeof columns[number]; token: string; days: number }) {
  const { key, title, description } = column
  const [until] = useState(() => Math.floor(Date.now() / 1000) - 1)
  const [items, setItems] = useState<Item[]>([])
  const [offset, setOffset] = useState(0)
  const [loadedOffset, setLoadedOffset] = useState(-1)
  const [hasMore, setHasMore] = useState(true)
  const sentinel = useRef<HTMLDivElement>(null)
  const pageSize = 20

  useEffect(() => {
    const controller = new AbortController()
    let retry: ReturnType<typeof setTimeout> | undefined
    async function load() {
      try {
        const params = new URLSearchParams({ from: new Date((until - days * 86400) * 1000).toISOString(),
          until: new Date(until * 1000).toISOString(), limit: String(pageSize), offset: String(offset), sort: 'volume' })
        const response = await fetch(`${API}/api/rankings?${params}`, { headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) })
        if (!response.ok) throw new Error('Rankings unavailable')
        const data: unknown = await response.json()
        if (!validLists(data, pageSize)) throw new Error('Invalid rankings')
        if (controller.signal.aborted) return
        const rows = data[key]
        setItems(current => {
          const ids = new Set(current.map(item => item.id))
          return [...current, ...rows.filter(item => !ids.has(item.id))]
        })
        setHasMore(rows.length === pageSize)
        setLoadedOffset(offset)
      } catch {
        if (!controller.signal.aborted) retry = setTimeout(() => { void load() }, 30000)
      }
    }
    void load()
    return () => { controller.abort(); clearTimeout(retry) }
  }, [key, token, days, until, offset])

  useEffect(() => {
    const target = sentinel.current
    if (!target || !hasMore || loadedOffset !== offset) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect()
        setOffset(value => value + pageSize)
      }
    }, { root: target.closest('.home-ranking-table-scroll'), rootMargin: '160px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loadedOffset, offset])

  return <>
    <Dialog.Title className="sr-only">{title}</Dialog.Title>
    <Dialog.Close className="sr-only">Fechar ranking</Dialog.Close>
    <Dialog.Description className="sr-only">{description}</Dialog.Description>
    <div className="home-ranking-table-frame">
      <div className="home-ranking-table-scroll" tabIndex={0} role="region" aria-label={`Tabela: ${title}`}>
        <table className={`home-ranking-table${key === 'writers' ? ' home-ranking-table-authors' : ''}`}>
          <thead><tr>
            <th scope="col" className="home-ranking-table-position"><span aria-label="Posição">#</span></th>
            <th scope="col">{key === 'writers' ? 'Autor' : key === 'categories' ? 'Categoria' : 'Entidade'}</th>
            <th scope="col" className="home-ranking-table-activity">Atividade</th>
            <th scope="col" className="home-ranking-table-total" aria-sort="descending">{key === 'mentions' ? 'Eventos' : 'Artigos'} <span aria-hidden="true">↓</span></th>
            {key === 'writers' && <>
              <th scope="col" className="home-ranking-table-rate">Artigos/dia</th>
              <th scope="col" className="home-ranking-table-contact">Contactos</th>
            </>}
          </tr></thead>
          <tbody>
            {items.map((item, index) => {
              const change = item.activity[item.activity.length - 1] - item.activity[0]
              const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
              const trend = change > 0 ? 'Atividade final superior à inicial' : change < 0 ? 'Atividade final inferior à inicial' : 'Atividade final igual à inicial'
              return <tr key={item.id}>
                <td className="home-ranking-position">{index + 1}</td>
                <th scope="row"><span className="home-ranking-table-name">{item.name}</span></th>
                <td className="home-ranking-table-activity"><span className={`home-ranking-trend is-${direction}`} role="img" aria-label={trend} title={trend}>
                  <Sparkline values={item.activity} width={88} height={22} area strokeWidth={1.5} curve />
                </span></td>
                <td className="home-ranking-table-total"><span className="home-ranking-count">{number.format(item.count)}</span></td>
                {key === 'writers' && <>
                  <td className="home-ranking-table-rate">{number.format([0.5, 1, 2, 3.5, 5, 8][item.id % 6])}</td>
                  <td className="home-ranking-table-contact">autor{item.id}@example.com</td>
                </>}
              </tr>
            })}
          </tbody>
        </table>
        {hasMore && <div ref={sentinel} className="home-ranking-loading" role="status" aria-label={`A carregar: ${title}`}>
          {Array.from({ length: 3 }, (_, index) => <div className="home-ranking-placeholder" key={index}><span /><span /></div>)}
        </div>}
        {!hasMore && items.length === 0 && <p className="home-ranking-empty">Sem resultados neste período.</p>}
      </div>
    </div>
  </>
}
