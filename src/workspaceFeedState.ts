import { useSyncExternalStore } from 'react'

export type WorkspaceEntry = { id: string; name: string; storageKey: string; legacyKeys: string[] }
export type WorkspaceFeed = { title: string; description: string; topics: string[] }

const validFeed = (value: unknown): value is WorkspaceFeed => {
  const feed = value as WorkspaceFeed | null
  return !!feed && typeof feed.title === 'string' && typeof feed.description === 'string'
    && Array.isArray(feed.topics) && feed.topics.every(topic => typeof topic === 'string')
}

function readJson(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}

/** Read one main feed. Legacy child records are retained as a backup, never rendered. */
export function readWorkspaceFeed(workspace: WorkspaceEntry): WorkspaceFeed {
  const fallback = { title: workspace.name, description: '', topics: [] }
  try {
    const saved = readJson(workspace.storageKey)
    if (validFeed(saved)) return saved
    const title = workspace.legacyKeys.map(key => localStorage.getItem(`${key}:folder-name`)?.trim()).find(Boolean) || workspace.name
    for (const key of workspace.legacyKeys) {
      const children = readJson(key)
      if (!Array.isArray(children) || !children.every(validFeed)) continue
      // Preserve the former parent's OR query, including its unfiltered case.
      const filters = children.map(child => child.topics.map(topic => topic.trim()).filter(Boolean))
      return { title, description: children.length === 1 ? children[0].description : '',
        topics: filters.some(topics => !topics.length) ? [] : [...new Set(filters.flat())].sort() }
    }
    return { ...fallback, title }
  } catch { /* The main feed remains usable when storage is unavailable. */ }
  return fallback
}

export function saveWorkspaceFeed(workspace: WorkspaceEntry, feed: WorkspaceFeed) {
  localStorage.setItem(workspace.storageKey, JSON.stringify(feed))
}

/** Old child links resolve to their workspace, not to a new child page. */
export function legacyWorkspaceId(path: string, currentId: string): string | null {
  const match = path.match(/^\/feeds\/([^/]+)(?:\/[^/]+)?\/?$/)
  if (!match) return null
  try { return path.replace(/\/$/, '').split('/').length === 4 ? decodeURIComponent(match[1]) : currentId }
  catch { return currentId }
}

const favoritePrefix = 'fontes:favorite:'
const favoritesChanged = 'fontes:favorites-changed'
const readFavorites = () => {
  try { return Object.keys(localStorage).filter(key => key.startsWith(favoritePrefix) && localStorage.getItem(key) === 'true').map(key => key.slice(favoritePrefix.length)).sort().join('\n') }
  catch { return '' }
}
function subscribeFavorites(listener: () => void) {
  window.addEventListener(favoritesChanged, listener)
  window.addEventListener('storage', listener)
  return () => { window.removeEventListener(favoritesChanged, listener); window.removeEventListener('storage', listener) }
}
export function useFavorites() {
  const value = useSyncExternalStore(subscribeFavorites, readFavorites)
  return value ? value.split('\n') : []
}
export function toggleFavorite(href: string) {
  localStorage.setItem(`${favoritePrefix}${href}`, String(!readFavorites().split('\n').includes(href)))
  window.dispatchEvent(new Event(favoritesChanged))
}

/** Collapse old favorite links once; leave legacy feed configuration untouched. */
export function migrateWorkspaceFavorites(workspace: WorkspaceEntry, basePath: string, current: boolean) {
  try {
    const childPrefix = `${basePath}/feeds/${encodeURIComponent(workspace.id)}/`
    const oldIds = workspace.legacyKeys.flatMap(key => {
      const children = readJson(key)
      return Array.isArray(children) ? children.flatMap(child => typeof child?.id === 'string' ? [child.id] : []) : []
    })
    const old = readFavorites().split('\n').filter(href => href.startsWith(childPrefix)
      || (current && oldIds.some(id => href === `${basePath}/feeds/${encodeURIComponent(id)}`)))
    if (!old.length) return
    localStorage.setItem(`${favoritePrefix}${basePath}/groups/${encodeURIComponent(workspace.id)}`, 'true')
    for (const href of old) localStorage.removeItem(`${favoritePrefix}${href}`)
    window.dispatchEvent(new Event(favoritesChanged))
  } catch { /* Favorites are optional; never block the main page. */ }
}
