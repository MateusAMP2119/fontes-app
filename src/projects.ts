import { useCallback, useEffect, useState } from 'react'

export type Project = { id: string; organizationId: string; name: string; createdAt: string }

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

export const createProject = (name: string) => api('POST', { name }) as Promise<Project>

/** Projects of the session's active organization. `enabled` false skips the request (no org yet). */
export function useProjects(enabled: boolean) {
  const [list, setList] = useState<Project[] | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let live = true
    setList(null)
    api('GET')
      .then((rows) => live && setList(rows as Project[]))
      // ponytail: a failed list reads as "no projects" so the user can still act; a 401 is already caught by the session gate
      .catch(() => live && setList([]))
    return () => {
      live = false
    }
  }, [enabled, version])
  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  return { list: list ?? [], pending: enabled && list === null, refresh }
}
