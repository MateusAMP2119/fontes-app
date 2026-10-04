import { useEffect, useMemo, useRef, useState } from 'react'
import type { AuthSession } from './auth'
import type { Bootstrap } from './onboardingSync'
import type { Project } from './projects'
import { cachedWorkspaces, invalidateWorkspaces, loadWorkspaces, workspaceCacheKey } from './workspaceCache'
import { retryRead } from './retryRead'
import { transitionView } from './viewTransition'
import type { WorkspaceEntry } from './workspaceFeedState'

type Workspace = NonNullable<Bootstrap['organization']>

/** Workspace discovery belongs to the app shell, not a hidden page editor. */
export function useWorkspaceDirectory(session: AuthSession | null, project: Project | null, organization: Bootstrap['organization']) {
  const userId = session?.user.id ?? 'preview'
  const cacheKey = session ? workspaceCacheKey(userId, session.session.id) : null
  const projectMapKey = `fontes:workspace-projects:v1:${userId}`
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => (cacheKey && cachedWorkspaces(cacheKey)) || (organization ? [organization] : []))
  const membershipVersion = useRef(0)
  const [ready, setReady] = useState(!session || !!(cacheKey && cachedWorkspaces(cacheKey)))
  const [projects, setProjects] = useState<Record<string, string>>(() => {
    // Reuse confirmed project mappings from the old editor's session cache.
    const result: Record<string, string> = {}
    try {
      const saved = JSON.parse(localStorage.getItem(projectMapKey) || '{}')
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        for (const [id, value] of Object.entries(saved)) if (typeof value === 'string') result[id] = value
      }
    } catch { /* Only confirmed mappings are an optional migration aid. */ }
    try {
      const states = JSON.parse(cacheKey ? sessionStorage.getItem(`${cacheKey}:states`) || '{}' : '{}')
      for (const state of Object.values(states) as Bootstrap[]) {
        if (state?.organization?.id && state.project?.id) result[state.organization.id] = state.project.id
      }
    } catch { /* The active workspace still supplies its project. */ }
    if (organization && project) result[organization.id] = project.id
    return result
  })
  useEffect(() => {
    try { localStorage.setItem(projectMapKey, JSON.stringify(projects)) } catch { /* Memory retains the mapping. */ }
  }, [projectMapKey, projects])
  useEffect(() => {
    if (!organization) return
    setWorkspaces(previous => previous.some(item => item.id === organization.id)
      ? previous.map(item => item.id === organization.id ? organization : item) : [...previous, organization])
    if (project) setProjects(previous => ({ ...previous, [organization.id]: project.id }))
  }, [organization, project])
  useEffect(() => {
    if (!cacheKey) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const refresh = async (): Promise<void> => {
      const version = membershipVersion.current
      try {
        const items = await retryRead(() => loadWorkspaces(cacheKey), controller.signal)
        if (version !== membershipVersion.current) { invalidateWorkspaces(cacheKey); return refresh() }
        transitionView(() => {
          setWorkspaces(previous => [
            ...previous.filter(item => items.some(next => next.id === item.id)).map(item => items.find(next => next.id === item.id)!),
            ...items.filter(item => !previous.some(old => old.id === item.id)),
          ])
          setReady(true)
        })
        timer = setTimeout(() => { invalidateWorkspaces(cacheKey); void refresh() }, 5 * 60 * 1000)
      } catch { /* Unmount cancels discovery and retry timers. */ }
    }
    void refresh()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [cacheKey])

  const entries = useMemo<WorkspaceEntry[]>(() => {
    const items = workspaces.length ? workspaces : organization ? [organization] : [{ id: project?.id ?? 'local', name: 'Área de trabalho' }]
    return items.map(workspace => ({
      id: workspace.id, name: workspace.name,
      storageKey: `fontes:workspace-feed:v1:${userId}:${workspace.id}`,
      legacyKeys: [...new Set([projects[workspace.id], workspace.id, ...(!organization && !project ? ['local'] : [])].filter(Boolean))]
        .map(id => `fontes:company-pages:v1:${userId}:${id}`),
    }))
  }, [workspaces, organization, project, projects, userId])
  const addWorkspace = (state: Bootstrap) => {
    if (!state.organization) return
    const workspace = state.organization
    membershipVersion.current++
    setWorkspaces(previous => [...previous.filter(item => item.id !== workspace.id), workspace])
    if (state.project) setProjects(previous => ({ ...previous, [workspace.id]: state.project!.id }))
    if (cacheKey) invalidateWorkspaces(cacheKey)
  }
  return { entries, ready, addWorkspace }
}
