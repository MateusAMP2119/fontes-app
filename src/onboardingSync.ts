import { API } from './api'
import type { Project } from './projects'

export type Bootstrap = { organization: { id: string; name: string; slug: string } | null; project: Project | null; profile: { name: string; image?: string }; revision: number; completed: boolean; changelog: boolean; daily: boolean; passwordRequired?: boolean; hasPassword?: boolean; canInvite?: boolean; canEditWorkspace?: boolean; accessLost?: boolean; operationId?: string }
export class SyncError extends Error {
  status: number
  step?: string
  retryAfter?: number
  conflict?: boolean
  code?: string
  recipientEmail?: string
  constructor(status: number, message: string, step?: string) { super(message); this.status = status; this.step = step }
}
export async function onboardingRequest<T>(path = '', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API}/api/onboarding${path}`, { method: body ? 'POST' : 'GET', credentials: 'include', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new SyncError(response.status, result.message || 'Não foi possível concluir o pedido.', result.step)
    error.conflict = result.conflict === true
    error.code = typeof result.code === 'string' ? result.code : undefined
    error.recipientEmail = typeof result.recipientEmail === 'string' ? result.recipientEmail : undefined
    const retry = response.headers.get('retry-after')
    if (retry) error.retryAfter = Math.max(1000, Number.isFinite(Number(retry)) ? Number(retry) * 1000 : Date.parse(retry) - Date.now())
    throw error
  }
  return result
}
export function inviteToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('') }
