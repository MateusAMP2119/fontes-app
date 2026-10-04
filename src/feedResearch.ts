import { API } from './api'
import { newRule, type FeedDraft } from './feedBuilderState'
export type ResearchMode = 'search' | 'build'
export type ContentKind = 'all' | 'stories' | 'events' | 'articles'
export type ResearchRequest = { query: string; mode: ResearchMode; kind: ContentKind; days: 1 | 7 | 30 }
export type ResearchSource = { id: number; title: string; description: string; url: string; publisher: string; date: string; kind: ContentKind }
export type ResearchResult = ResearchRequest & {
  title: string; rules: { terms: string[]; operator: 'and' | 'not'; scope: 'title' | 'content' }[]
  entities: { name: string; matches: { id: number; name: string; kind: string }[] }[]
  sources: ResearchSource[]; paragraphs: { text: string; citations: number[] }[]; elapsed_ms: number
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function isResearchResult(v: unknown): v is ResearchResult {
  if (!record(v) || !['search','build'].includes(String(v.mode)) || typeof v.query !== 'string' || typeof v.title !== 'string' || ![1,7,30].includes(Number(v.days)) || !['all','stories','events','articles'].includes(String(v.kind))
    || !Number.isFinite(v.elapsed_ms) || !Array.isArray(v.sources) || v.sources.length > 24 || !Array.isArray(v.paragraphs) || !Array.isArray(v.rules) || !v.rules.length || !Array.isArray(v.entities)) return false
  return v.sources.every(s => record(s) && Number.isSafeInteger(s.id) && ['title','description','url','publisher','date'].every(k => typeof s[k] === 'string') && /^https?:\/\//.test(String(s.url)))
    && v.paragraphs.every(p => record(p) && typeof p.text === 'string' && Array.isArray(p.citations) && p.citations.every(id => (v.sources as ResearchSource[]).some(s => s.id === id)))
    && v.rules.every(r => record(r) && ['and','not'].includes(String(r.operator)) && ['title','content'].includes(String(r.scope)) && Array.isArray(r.terms) && r.terms.every(t => typeof t === 'string'))
    && v.entities.every(e => record(e) && typeof e.name === 'string' && Array.isArray(e.matches) && e.matches.every(m => record(m) && Number.isSafeInteger(m.id) && typeof m.name === 'string' && typeof m.kind === 'string'))
}
export async function loadResearch(input: ResearchRequest, token: string, signal: AbortSignal): Promise<ResearchResult> {
  const response = await fetch(`${API}/api/research`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ query: input.query, mode: input.mode, kind: input.kind, days: input.days }), signal: AbortSignal.any([signal, AbortSignal.timeout(95000)]) })
  if (!response.ok) throw new Error('RESEARCH_UNAVAILABLE')
  const result: unknown = await response.json()
  if (!isResearchResult(result) || result.query !== input.query || result.mode !== input.mode || result.days !== input.days || result.kind !== input.kind) throw new Error('INVALID_RESEARCH_RESULT')
  return result
}
export function researchDraft(result: ResearchResult): FeedDraft {
  return { title: result.title, days: result.days, kind: result.kind, sources: [], sourceMode: 'all', rules: result.rules.map(rule => ({ ...newRule(rule.operator), ...rule })) }
}
