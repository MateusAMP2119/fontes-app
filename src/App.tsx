import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Point } from './camera/camera'
import {
  createInkItem,
  createItem,
  createVizItem,
  type Item,
  type ItemType,
} from './items/items'
import type { VizDef } from './viz/catalog'
import {
  addTag,
  createBoard,
  createFolder,
  loadWorkspace,
  removeTag,
  saveWorkspace,
  setBoardFolder,
  type Board,
  type Workspace,
} from './workspace/workspace'
import { BoardsPanel } from './components/BoardsPanel'
import { BottomBar, type Tool } from './components/BottomBar'
import { Canvas } from './components/Canvas'
import { TopActions } from './components/TopActions'
import './App.css'

export default function App() {
  const [ws, setWs] = useState<Workspace>(loadWorkspace)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [showMobile, setShowMobile] = useState(false)
  const stickySeed = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const activeBoard = useMemo(
    () => ws.boards.find((b) => b.id === ws.activeId) ?? ws.boards[0],
    [ws],
  )

  useEffect(() => {
    saveWorkspace(ws)
  }, [ws])

  const updateActiveBoard = useCallback((update: (board: Board) => Board) => {
    setWs((prev) => ({
      ...prev,
      boards: prev.boards.map((b) => (b.id === prev.activeId ? update(b) : b)),
    }))
  }, [])

  const setItems = useCallback(
    (update: (items: Item[]) => Item[]) => {
      updateActiveBoard((b) => ({ ...b, items: update(b.items) }))
    },
    [updateActiveBoard],
  )

  const clearBoardUiState = useCallback(() => {
    setSelectedIds([])
    setEditingId(null)
    setTool('select')
  }, [])

  /** Center of the board content row (items are positioned within it). */
  const centerPoint = useCallback((): Point => {
    const rect = contentRef.current?.getBoundingClientRect()
    return rect
      ? { x: rect.width / 2, y: rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }, [])

  const insertItem = useCallback(
    (type: Exclude<ItemType, 'ink' | 'chart'>) => {
      const item = createItem(type, centerPoint(), stickySeed.current)
      if (type === 'sticky') stickySeed.current += 1
      setItems((prev) => [...prev, item])
      setSelectedIds([item.id])
      setEditingId(item.id)
      setTool('select')
    },
    [centerPoint, setItems],
  )

  const insertViz = useCallback(
    (viz: VizDef) => {
      const item = createVizItem(centerPoint(), viz.sketch, viz.name)
      setItems((prev) => [...prev, item])
      setSelectedIds([item.id])
      setEditingId(null)
      setTool('select')
    },
    [centerPoint, setItems],
  )

  const updateItem = useCallback(
    (next: Item) => {
      setItems((prev) => prev.map((it) => (it.id === next.id ? next : it)))
    },
    [setItems],
  )

  const commitStroke = useCallback(
    (points: Point[]) => {
      if (points.length === 0) return
      // A click without movement is a deliberate dot — keep it.
      setItems((prev) => [...prev, createInkItem(points)])
    },
    [setItems],
  )

  const deleteSelection = useCallback(() => {
    if (selectedIds.length === 0) return
    setItems((prev) => prev.filter((it) => !selectedIds.includes(it.id)))
    setSelectedIds([])
    setEditingId(null)
  }, [selectedIds, setItems])

  const selectOnly = useCallback((id: string) => {
    setSelectedIds([id])
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  /** Move the anchor item; if it is part of the selection, move the group. */
  const dragItemsBy = useCallback(
    (anchorId: string, dx: number, dy: number) => {
      setItems((prev) => {
        const group = selectedIds.includes(anchorId) ? selectedIds : [anchorId]
        return prev.map((it) =>
          group.includes(it.id) ? { ...it, x: it.x + dx, y: it.y + dy } : it,
        )
      })
    },
    [selectedIds, setItems],
  )

  // —— workspace actions ——
  const selectBoard = useCallback(
    (id: string) => {
      setWs((prev) => ({ ...prev, activeId: id }))
      clearBoardUiState()
    },
    [clearBoardUiState],
  )

  const newBoard = useCallback(() => {
    const board = createBoard()
    setWs((prev) => ({
      ...prev,
      boards: [board, ...prev.boards],
      activeId: board.id,
    }))
    clearBoardUiState()
  }, [clearBoardUiState])

  const newFolder = useCallback((name: string) => {
    setWs((prev) => ({ ...prev, folders: [...prev.folders, createFolder(name)] }))
  }, [])

  // Keyboard: delete selection, escape closes sidebar / ends editing/selection/draw.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inEditor =
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA'
      if (e.key === 'Escape') {
        if (sidebarOpen) setSidebarOpen(false)
        else if (editingId) setEditingId(null)
        else if (selectedIds.length > 0) setSelectedIds([])
        else if (tool !== 'select') setTool('select')
        return
      }
      if (inEditor) return
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        deleteSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelection, editingId, selectedIds, sidebarOpen, tool])

  return (
    <div className="app" data-testid="app-shell">
      <header className="top-bar">
        <BoardsPanel
          open={sidebarOpen}
          workspace={ws}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          onProjectNameChange={(name) => updateActiveBoard((b) => ({ ...b, name }))}
          onSelectBoard={selectBoard}
          onCreateBoard={newBoard}
          onCreateFolder={newFolder}
          onSetBoardFolder={(boardId, folderId) =>
            setWs((prev) => setBoardFolder(prev, boardId, folderId))
          }
          onAddTag={(boardId, tag) => setWs((prev) => addTag(prev, boardId, tag))}
          onRemoveTag={(boardId, tag) =>
            setWs((prev) => removeTag(prev, boardId, tag))
          }
        />
        <TopActions />
      </header>

      <div className="board-content" ref={contentRef}>
        <div className="stage">
          <Canvas
            items={activeBoard.items}
            selectedIds={selectedIds}
            editingId={editingId}
            tool={tool}
            showMobile={showMobile}
            onSelectOnly={selectOnly}
            onToggleSelect={toggleSelect}
            onSelectMany={setSelectedIds}
            onDragBy={dragItemsBy}
            onEdit={setEditingId}
            onItemChange={updateItem}
            onStroke={commitStroke}
          />
        </div>
      </div>

      <BottomBar
        tool={tool}
        hasSelection={selectedIds.length > 0}
        showMobile={showMobile}
        onToolChange={setTool}
        onInsert={insertItem}
        onInsertViz={insertViz}
        onDelete={deleteSelection}
        onToggleMobile={() => setShowMobile((prev) => !prev)}
      />
    </div>
  )
}
