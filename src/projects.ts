import { useCallback, useEffect, useState } from 'react'

export type Project = { id: string; organizationId: string; name: string; createdAt: string; ownerId: string | null; visibility: 'private' | 'public' }

async function api(method: 'GET' | 'POST', body?: unknown): Promise<unknown> {
  const response = await fetch('/api/projects', {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`projects ${method} ${response.status}`)
  return response.json()
}

export const createProject = (name: string, visibility: Project['visibility'] = 'private') => api('POST', { name, visibility }) as Promise<Project>

/** Projects of the session's active organization. `enabled` false skips the request (no org yet). */
export function useProjects(enabled: boolean) {
  const [list, setList] = useState<Project[] | null>(null)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let live = true
    setList(null)
    setError(false)
    api('GET')
      .then((rows) => {
        if (!Array.isArray(rows)) throw new Error('Invalid project response')
        if (live) setList(rows as Project[])
      })
      .catch(() => { if (live) setError(true) })
    return () => {
      live = false
    }
  }, [enabled, version])
  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  return { list: list ?? [], pending: enabled && list === null && !error, error, refresh }
}
