/** Workspace model + localStorage persistence (migrates from v1). */

import type { Item } from '../items/items'

export type Folder = { id: string; name: string }

export type Board = {
  id: string
  name: string
  folderId: string | null
  items: Item[]
  /**
   * The news event this board was built for. Optional and additive, so a
   * stored v2 workspace stays valid — boards saved before topics existed read
   * back as undefined, which every check treats the same as null.
   */
  topicId?: string | null
}

export type Workspace = {
  boards: Board[]
  folders: Folder[]
  activeId: string
}

export const WORKSPACE_KEY = 'fontes.workspace.v2'
const LEGACY_KEY = 'fontes.project.v1'

let idCounter = 0

export function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/** Boards start unnamed — picking a topic names them. */
export function createBoard(name = ''): Board {
  return { id: nextId('board'), name, folderId: null, items: [], topicId: null }
}

/** Stand-in wherever an unnamed board still needs a label. */
export const UNNAMED_BOARD = 'New page'

export function createFolder(name: string): Folder {
  return { id: nextId('folder'), name }
}

export function emptyWorkspace(): Workspace {
  const board = createBoard()
  return { boards: [board], folders: [], activeId: board.id }
}

/** v1 payload ({projectName, items}) → workspace with one board. */
export function migrateLegacy(raw: string): Workspace | null {
  try {
    const parsed = JSON.parse(raw) as { projectName?: string; items?: Item[] }
    if (!Array.isArray(parsed.items)) return null
    const board: Board = {
      ...createBoard(parsed.projectName || ''),
      items: parsed.items,
    }
    return { boards: [board], folders: [], activeId: board.id }
  } catch {
    return null
  }
}

function isWorkspace(value: unknown): value is Workspace {
  const ws = value as Workspace
  return (
    !!ws &&
    Array.isArray(ws.boards) &&
    Array.isArray(ws.folders) &&
    typeof ws.activeId === 'string' &&
    ws.boards.length > 0
  )
}

const KNOWN_TYPES = new Set<string>(['text', 'sticky', 'note', 'table', 'viz', 'ink'])

/**
 * Drop items whose type no longer exists. isWorkspace only validates the
 * envelope, and renderBody's switch has no default, so a stale item (the
 * removed 'chart' type, say) would render as an invisible box that is still
 * draggable and still marquee-selectable.
 */
function sanitize(ws: Workspace): Workspace {
  return {
    ...ws,
    boards: ws.boards.map((b) => ({
      ...b,
      items: (b.items ?? []).filter((it) => it && KNOWN_TYPES.has(it.type)),
    })),
  }
}

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (isWorkspace(parsed)) {
        const ws = sanitize(parsed)
        if (!ws.boards.some((b) => b.id === ws.activeId)) {
          return { ...ws, activeId: ws.boards[0].id }
        }
        return ws
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const migrated = migrateLegacy(legacy)
      if (migrated) return migrated
    }
  } catch {
    // corrupted storage — start fresh
  }
  return emptyWorkspace()
}

export function saveWorkspace(ws: Workspace): void {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ws))
  } catch {
    // storage full/unavailable — app still works, just not persisted
  }
}

export function setBoardFolder(
  ws: Workspace,
  boardId: string,
  folderId: string | null,
): Workspace {
  return {
    ...ws,
    boards: ws.boards.map((b) => (b.id === boardId ? { ...b, folderId } : b)),
  }
}
