import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { clamp, type Point } from './camera/camera'
import { createInkItem, createItem, type InsertableType, type Item } from './items/items'
import {
  createBoard,
  createFolder,
  loadWorkspace,
  saveWorkspace,
  setBoardFolder,
  type Board,
  type Workspace,
} from './workspace/workspace'
import { BoardsPanel } from './components/BoardsPanel'
import { BottomBar, type Tool } from './components/BottomBar'
import { Canvas } from './components/Canvas'
import { TopActions } from './components/TopActions'
import { BuildGhost, type GhostRect } from './components/picker/BuildGhost'
import { TopicComposer } from './components/picker/TopicComposer'
import { buildDashboard } from './news/dashboard'
import type { NewsEvent } from './news/events'
import { measureFrame } from './news/frame'
import './App.css'

/** Matches the minor grid tile painted on .app. */
const GRID_SNAP = 24
/** Breathing room between a settled card and the frame edge. */
const FRAME_PAD = 8

/** A dashboard mid-flight: computed up front, committed when the ghost lands. */
type Build = { event: NewsEvent; from: GhostRect; items: Item[] }

export default function App() {
  const [ws, setWs] = useState<Workspace>(loadWorkspace)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [showMobile, setShowMobile] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [build, setBuild] = useState<Build | null>(null)
  const [status, setStatus] = useState('')
  const stickySeed = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

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
    (type: InsertableType) => {
      const item = createItem(type, centerPoint(), stickySeed.current)
      if (type === 'sticky') stickySeed.current += 1
      setItems((prev) => [...prev, item])
      setSelectedIds([item.id])
      setEditingId(item.id)
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

  /**
   * On drop, snap the dragged items to the background grid and keep them
   * inside the PC frame. The grid is painted on .app from the window origin,
   * while items are positioned against .board-content — the rect offset
   * converts between the two so snapped edges land on painted lines.
   */
  const settleItems = useCallback(
    (anchorId: string) => {
      const frame = measureFrame(frameRef.current, contentRef.current)
      const origin = contentRef.current?.getBoundingClientRect()
      const offX = origin?.left ?? 0
      const offY = origin?.top ?? 0
      const snap = (v: number, off: number) =>
        Math.round((v + off) / GRID_SNAP) * GRID_SNAP - off
      setItems((prev) => {
        const group = selectedIds.includes(anchorId) ? selectedIds : [anchorId]
        return prev.map((it) => {
          if (!group.includes(it.id)) return it
          const maxX = Math.max(frame.x + frame.w - FRAME_PAD - it.w, frame.x + FRAME_PAD)
          const maxY = Math.max(frame.y + frame.h - FRAME_PAD - it.h, frame.y + FRAME_PAD)
          const x = clamp(snap(it.x, offX), frame.x + FRAME_PAD, maxX)
          const y = clamp(snap(it.y, offY), frame.y + FRAME_PAD, maxY)
          return x === it.x && y === it.y ? it : { ...it, x, y }
        })
      })
    },
    [selectedIds, setItems],
  )

  // Workspace actions
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

  // Pick-topic mode
  /**
   * A creation affordance, not an empty state: once a board has a topic it
   * never comes back, even if every widget is deleted. Re-showing it would
   * seize a board mid-edit, and there is no undo to escape with.
   *
   * The way out without picking a topic is the toolbar — inserting anything
   * puts an item on the board, which retires the composer.
   */
  const showPicker = activeBoard.topicId == null && activeBoard.items.length === 0

  /** Compute the whole dashboard now; the ghost is just the travel time. */
  const startBuild = useCallback((event: NewsEvent, from: DOMRect) => {
    const frame = frameRef.current
    const frameRect = frame?.getBoundingClientRect()
    const items = buildDashboard(event, measureFrame(frame, contentRef.current))
    setBuild({
      event,
      items,
      from: {
        left: from.left - (frameRect?.left ?? 0),
        top: from.top - (frameRect?.top ?? 0),
        width: from.width,
        height: from.height,
      },
    })
  }, [])

  const commitBuild = useCallback(
    (pending: Build) => {
      updateActiveBoard((b) => ({
        ...b,
        topicId: pending.event.id,
        // Don't clobber a board the user already named.
        name: b.name.trim() ? b.name : pending.event.title,
        items: [...b.items, ...pending.items],
      }))
      setBuild(null)
      setPickerQuery('')
      setStatus(
        `${pending.event.title} dashboard built. ${pending.items.length} widgets added.`,
      )
      viewportRef.current?.focus()
    },
    [updateActiveBoard],
  )

  // Keyboard: delete selection, escape closes sidebar / ends editing/selection/draw.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inEditor =
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA'
      if (e.key === 'Escape') {
        // The composer clears its query first, then falls through as usual.
        if (showPicker && !build && pickerQuery) {
          setPickerQuery('')
          return
        }
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
  }, [
    build,
    deleteSelection,
    editingId,
    pickerQuery,
    selectedIds,
    showPicker,
    sidebarOpen,
    tool,
  ])

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
        />
        <TopActions />
      </header>

      <div
        className={`board-content${sidebarOpen ? ' is-shelved' : ''}`}
        ref={contentRef}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={activeBoard.id}
            className="stage"
            initial={{ opacity: 0, scale: 0.985, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.015, filter: 'blur(6px)' }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0.28, 1] }}
          >
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
              onDragEnd={settleItems}
              onEdit={setEditingId}
              onItemChange={updateItem}
              onStroke={commitStroke}
              frameRef={frameRef}
              viewportRef={viewportRef}
              // Undefined while the board is claimed, so the frame stays the
              // decorative, aria-hidden surface it was.
              frameContent={
                showPicker ? (
                  <>
                    <TopicComposer
                      query={pickerQuery}
                      onQueryChange={setPickerQuery}
                      onPick={startBuild}
                      leaving={build !== null}
                    />
                    {build && (
                      <BuildGhost
                        event={build.event}
                        from={build.from}
                        onDone={() => commitBuild(build)}
                      />
                    )}
                  </>
                ) : undefined
              }
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomBar
        tool={tool}
        hasSelection={selectedIds.length > 0}
        showMobile={showMobile}
        onToolChange={setTool}
        onInsert={insertItem}
        onDelete={deleteSelection}
        onToggleMobile={() => setShowMobile((prev) => !prev)}
      />

      {/* Owned by App so it survives the composer unmounting mid-build */}
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
    </div>
  )
}
