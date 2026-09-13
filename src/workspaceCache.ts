import { API } from './api'
import { onboardingRequest, type Bootstrap } from './onboardingSync'

type Workspace = NonNullable<Bootstrap['organization']>
type Entry = { expiresAt: number; workspaces: Workspace[] }
const lifetime = 5 * 60 * 1000
const memory = new Map<string, Entry>()
const pending = new Map<string, Promise<Workspace[]>>()
export const workspaceCacheKey = (userId: string, sessionId: string) => `fontes:workspaces:v1:${API}:${userId}:${sessionId}`

export function cachedWorkspaces(key: string): Workspace[] | null {
  let entry = memory.get(key)
  if (!entry) {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || 'null')
      if (value && typeof value.expiresAt === 'number' && Array.isArray(value.workspaces)
        && value.workspaces.every((w: Workspace) => w && typeof w.id === 'string' && typeof w.name === 'string' && typeof w.slug === 'string')) entry = value
    } catch { /* Storage may be disabled or contain an older value. */ }
  }
  if (!entry || entry.expiresAt <= Date.now()) return null
  memory.set(key, entry)
  return entry.workspaces
}

export function invalidateWorkspaces(key: string) {
  memory.delete(key)
  try { sessionStorage.removeItem(key) } catch { /* Memory cache still clears. */ }
}

export function loadWorkspaces(key: string): Promise<Workspace[]> {
  const cached = cachedWorkspaces(key)
  if (cached) return Promise.resolve(cached)
  const existing = pending.get(key)
  if (existing) return existing
  // Closing the dropdown does not cancel the shared request.
  const request = onboardingRequest<{ workspaces: Workspace[] }>('/workspaces')
    .then(({ workspaces }) => {
      const entry = { workspaces, expiresAt: Date.now() + lifetime }
      memory.set(key, entry)
      try { sessionStorage.setItem(key, JSON.stringify(entry)) } catch { /* In-memory caching remains available. */ }
      return workspaces
    }).finally(() => pending.delete(key))
  pending.set(key, request)
  return request
}
