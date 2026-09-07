import { API } from './api'
import type { Project } from './projects'

export type Bootstrap = { organization: { id: string; name: string; slug: string } | null; project: Project | null; profile: { name: string; image?: string }; revision: number; completed: boolean; changelog: boolean; daily: boolean }
export class SyncError extends Error {
  status: number
  step?: string
  constructor(status: number, message: string, step?: string) { super(message); this.status = status; this.step = step }
}
export async function onboardingRequest<T>(path = '', body?: unknown): Promise<T> {
  const response = await fetch(`${API}/api/onboarding${path}`, { method: body ? 'POST' : 'GET', credentials: 'include', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new SyncError(response.status, result.message || 'Erro ao guardar', result.step)
  return result
}
export function inviteToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('') }
