import { describe, expect, it } from 'vitest'
import {
  addTag,
  createBoard,
  emptyWorkspace,
  migrateLegacy,
  removeTag,
  setBoardFolder,
} from './workspace'

describe('migrateLegacy', () => {
  it('wraps a v1 project into a one-board workspace', () => {
    const ws = migrateLegacy(
      JSON.stringify({ projectName: 'Old board', items: [] }),
    )
    expect(ws).not.toBeNull()
    expect(ws!.boards).toHaveLength(1)
    expect(ws!.boards[0].name).toBe('Old board')
    expect(ws!.activeId).toBe(ws!.boards[0].id)
  })

  it('rejects malformed payloads', () => {
    expect(migrateLegacy('not json')).toBeNull()
    expect(migrateLegacy('{"projectName":"x"}')).toBeNull()
  })
})

describe('tags', () => {
  it('adds trimmed tags and dedupes case-insensitively', () => {
    let ws = emptyWorkspace()
    const id = ws.boards[0].id
    ws = addTag(ws, id, '  design ')
    ws = addTag(ws, id, 'Design')
    expect(ws.boards[0].tags).toEqual(['design'])
  })

  it('ignores empty tags and removes exact tags', () => {
    let ws = emptyWorkspace()
    const id = ws.boards[0].id
    ws = addTag(ws, id, '   ')
    expect(ws.boards[0].tags).toEqual([])
    ws = addTag(ws, id, 'q3')
    ws = removeTag(ws, id, 'q3')
    expect(ws.boards[0].tags).toEqual([])
  })
})

describe('setBoardFolder', () => {
  it('assigns and clears the folder', () => {
    let ws = emptyWorkspace()
    const id = ws.boards[0].id
    ws = setBoardFolder(ws, id, 'folder-1')
    expect(ws.boards[0].folderId).toBe('folder-1')
    ws = setBoardFolder(ws, id, null)
    expect(ws.boards[0].folderId).toBeNull()
  })
})

describe('createBoard', () => {
  it('creates unique ids', () => {
    expect(createBoard().id).not.toBe(createBoard().id)
  })
})
