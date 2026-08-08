import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { clamp, type Point } from './camera/camera'
import {
  createInkItem,
  createItem,
  type Bounds,
  type GridPos,
  type InsertableType,
  type Item,
  type VizItem,
} from './items/items'
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
import { buildDashboard, DEFAULT_TOTAL_ROWS } from './news/dashboard'
import type { NewsEvent } from './news/events'
import { measureFrame } from './news/frame'
import {
  adopt,
  applyMove,
  applyResize,
  compact,
  GRID,
  gridMetrics,
  gridToPx,
  maxRows,
  nearestPreset,
  pxToCell,
  solveRowH,
  type GridEntry,
  type GridMetrics,
} from './news/grid'
import './App.css'

/** Matches the minor grid tile painted on .app. */
const GRID_SNAP = 24
/** Breathing room between a settled card and the frame edge. */
const FRAME_PAD = 8

/** A dashboard mid-flight: computed up front, committed when the ghost lands. */
type Build = { event: NewsEvent; from: GhostRect; items: Item[]; rowH: number }

/** A widget drag/resize in flight: free pixels plus the previewed grid. */
type GridDrag = {
  id: string
  mode: 'move' | 'resize'
  /** Where the card itself renders — raw, following the pointer. */
  px: Bounds
  /** The full widget layout as it will commit on release. */
  layout: GridEntry[]
  /** Last requested cell/spans — the layout recomputes only when it changes. */
  request: GridPos
}

/** Grid entries for a board's widgets; skips any that have not adopted yet. */
function vizEntries(items: Item[]): GridEntry[] {
  return items.flatMap((it) =>
    it.type === 'viz' && it.grid ? [{ id: it.id, ...it.grid }] : [],
  )
}

export default function App() {
  const [ws, setWs] = useState<Workspace>(loadWorkspace)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [showMobile, setShowMobile] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [build, setBuild] = useState<Build | null>(null)
  const [gridDrag, setGridDrag] = useState<GridDrag | null>(null)
  const [frameTick, setFrameTick] = useState(0)
  const [status, setStatus] = useState('')
  const stickySeed = useRef(0)
  /** Committed widget layout snapshotted when a grid drag/resize starts. */
  const gridBaseRef = useRef<GridEntry[] | null>(null)
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
    setGridDrag(null)
    gridBaseRef.current = null
  }, [])

  /** Frame measure + grid metrics for the active board, on demand. */
  const boardMetrics = useCallback((): { frame: Bounds; m: GridMetrics } => {
    const frame = measureFrame(frameRef.current, contentRef.current)
    const rowH = activeBoard.vizRowH ?? solveRowH(frame, DEFAULT_TOTAL_ROWS)
    return { frame, m: gridMetrics(frame, rowH) }
  }, [activeBoard.vizRowH])

  /**
   * Reconcile widgets with the grid: adopt grid coordinates for boards saved
   * before they existed, settle the layout, and re-derive x/y/w/h from the
   * measured frame. Runs on board switch, after deletes, and whenever the
   * frame resizes — safe now that grid units, not pixels, are authoritative.
   */
  const syncViz = useCallback(() => {
    const frame = measureFrame(frameRef.current, contentRef.current)
    setWs((prev) => {
      const board = prev.boards.find((b) => b.id === prev.activeId)
      if (!board) return prev
      const viz = board.items.filter((it): it is VizItem => it.type === 'viz')
      if (viz.length === 0) return prev
      const rowH = board.vizRowH ?? solveRowH(frame, DEFAULT_TOTAL_ROWS)
      const m = gridMetrics(frame, rowH)
      const entries = compact(
        viz.every((v) => v.grid)
          ? viz.map((v) => ({ id: v.id, ...(v.grid as GridPos) }))
          : adopt(viz, m),
      )
      const byId = new Map(entries.map((e) => [e.id, e]))
      let changed = board.vizRowH !== rowH
      const items = board.items.map((it) => {
        if (it.type !== 'viz') return it
        const e = byId.get(it.id)
        if (!e) return it
        const { x, y, w, h } = gridToPx(e, m)
        const g = it.grid
        if (
          it.x === x && it.y === y && it.w === w && it.h === h &&
          g && g.col === e.col && g.row === e.row &&
          g.colSpan === e.colSpan && g.rowSpan === e.rowSpan
        ) {
          return it
        }
        changed = true
        return {
          ...it,
          x, y, w, h,
          grid: { col: e.col, row: e.row, colSpan: e.colSpan, rowSpan: e.rowSpan },
        }
      })
      if (!changed) return prev
      return {
        ...prev,
        boards: prev.boards.map((b) =>
          b.id === board.id ? { ...b, items, vizRowH: rowH } : b,
        ),
      }
    })
  }, [])

  // Keep widget pixels in lockstep with the frame across board switches,
  // sidebar shelving, the mobile split, and window resizes.
  useLayoutEffect(syncViz, [syncViz, activeBoard.id, frameTick])

  // The frame is remounted on board switch (the stage is keyed), so the
  // observer re-binds along with it.
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setFrameTick((t) => t + 1))
    observer.observe(el)
    return () => observer.disconnect()
  }, [activeBoard.id])

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
    // Surviving widgets compact upward into the freed rows.
    syncViz()
    setSelectedIds([])
    setEditingId(null)
  }, [selectedIds, setItems, syncViz])

  const selectOnly = useCallback((id: string) => {
    setSelectedIds([id])
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  /**
   * Move the anchor to an absolute position. Freeform items translate as a
   * group (widgets never join — they belong to the grid); a widget anchor
   * instead drives a grid preview: the card follows the pointer raw while
   * the layout it would commit to reflows around its snapped cell.
   */
  const dragItemTo = useCallback(
    (anchorId: string, x: number, y: number) => {
      const anchor = activeBoard.items.find((it) => it.id === anchorId)
      if (!anchor) return
      if (anchor.type !== 'viz') {
        const dx = x - anchor.x
        const dy = y - anchor.y
        if (dx === 0 && dy === 0) return
        setItems((prev) => {
          const group = selectedIds.includes(anchorId) ? selectedIds : [anchorId]
          return prev.map((it) =>
            group.includes(it.id) && it.type !== 'viz'
              ? { ...it, x: it.x + dx, y: it.y + dy }
              : it,
          )
        })
        return
      }
      if (!anchor.grid) return
      const { frame, m } = boardMetrics()
      const base =
        gridBaseRef.current ?? (gridBaseRef.current = vizEntries(activeBoard.items))
      const { colSpan, rowSpan } = anchor.grid
      const cell = pxToCell(x, y, m)
      const col = clamp(cell.col, 0, GRID.cols - colSpan)
      const row = clamp(cell.row, 0, Math.max(0, maxRows(frame, m) - rowSpan))
      const px = { x, y, w: anchor.w, h: anchor.h }
      setGridDrag((prev) => {
        if (prev?.id === anchorId && prev.request.col === col && prev.request.row === row) {
          return { ...prev, px }
        }
        // Settle unpinned after the pinned move so the dragged card also
        // floats up — the placeholder then shows where it truly lands.
        const layout = compact(applyMove(base, anchorId, col, row))
        return { id: anchorId, mode: 'move', px, layout, request: { col, row, colSpan, rowSpan } }
      })
    },
    [activeBoard.items, boardMetrics, selectedIds, setItems],
  )

  /** Resize a widget by its handles; spans snap, neighbors reflow. */
  const resizeItemTo = useCallback(
    (id: string, w: number, h: number) => {
      const anchor = activeBoard.items.find((it) => it.id === id)
      if (anchor?.type !== 'viz' || !anchor.grid) return
      const { frame, m } = boardMetrics()
      const base =
        gridBaseRef.current ?? (gridBaseRef.current = vizEntries(activeBoard.items))
      const { col, row } = anchor.grid
      const maxColSpan = Math.max(GRID.minColSpan, GRID.cols - col)
      const maxRowSpan = Math.max(GRID.minRowSpan, maxRows(frame, m) - row)
      // Snap to the size vocabulary; clamp again for the edge-of-frame
      // fallback where no preset fits the remaining spans.
      const spans = nearestPreset(w, h, m, maxColSpan, maxRowSpan)
      const colSpan = clamp(spans.colSpan, GRID.minColSpan, maxColSpan)
      const rowSpan = clamp(spans.rowSpan, GRID.minRowSpan, maxRowSpan)
      const px = { x: anchor.x, y: anchor.y, w, h }
      setGridDrag((prev) => {
        if (
          prev?.id === id && prev.mode === 'resize' &&
          prev.request.colSpan === colSpan && prev.request.rowSpan === rowSpan
        ) {
          return { ...prev, px }
        }
        const layout = compact(applyResize(base, id, colSpan, rowSpan))
        return { id, mode: 'resize', px, layout, request: { col, row, colSpan, rowSpan } }
      })
    },
    [activeBoard.items, boardMetrics],
  )

  /** Land the previewed grid: write cells and re-derived pixels to the board. */
  const commitGridDrag = useCallback(() => {
    gridBaseRef.current = null
    if (!gridDrag) return
    const { m } = boardMetrics()
    const byId = new Map(gridDrag.layout.map((e) => [e.id, e]))
    setItems((prev) =>
      prev.map((it) => {
        const e = it.type === 'viz' ? byId.get(it.id) : undefined
        if (!e) return it
        return {
          ...it,
          ...gridToPx(e, m),
          grid: { col: e.col, row: e.row, colSpan: e.colSpan, rowSpan: e.rowSpan },
        }
      }),
    )
    setGridDrag(null)
  }, [boardMetrics, gridDrag, setItems])


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
          // Widgets settle through the dashboard grid, never this snap.
          if (!group.includes(it.id) || it.type === 'viz') return it
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

  const endItemDrag = useCallback(
    (anchorId: string) => {
      const anchor = activeBoard.items.find((it) => it.id === anchorId)
      if (anchor?.type === 'viz') commitGridDrag()
      else settleItems(anchorId)
    },
    [activeBoard.items, commitGridDrag, settleItems],
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
    const { items, rowH } = buildDashboard(event, measureFrame(frame, contentRef.current))
    setBuild({
      event,
      items,
      rowH,
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
        vizRowH: pending.rowH,
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

  /** During a widget drag the board renders the preview, not the saved state. */
  const { displayItems, gridGhost } = useMemo(() => {
    if (!gridDrag) return { displayItems: activeBoard.items, gridGhost: null }
    const frame = measureFrame(frameRef.current, contentRef.current)
    const m = gridMetrics(frame, activeBoard.vizRowH ?? solveRowH(frame, DEFAULT_TOTAL_ROWS))
    const byId = new Map(gridDrag.layout.map((e) => [e.id, e]))
    const items = activeBoard.items.map((it) => {
      if (it.id === gridDrag.id) return { ...it, ...gridDrag.px }
      const e = it.type === 'viz' ? byId.get(it.id) : undefined
      return e ? { ...it, ...gridToPx(e, m) } : it
    })
    const target = byId.get(gridDrag.id)
    return { displayItems: items, gridGhost: target ? gridToPx(target, m) : null }
  }, [activeBoard.items, activeBoard.vizRowH, gridDrag])

  /**
   * The unit made visible: one rect per cell, while the grid toggle is on or
   * a drag/resize is live. Skipped while the board is still unclaimed — no
   * widgets, nothing for a lattice to measure against.
   */
  const overlayOn = (showGrid || gridDrag !== null) && activeBoard.items.some((it) => it.type === 'viz')
  const gridCells = useMemo(() => {
    // frameTick re-runs the measure after frame resizes; the refs are stable.
    void frameTick
    if (!overlayOn) return null
    const frame = measureFrame(frameRef.current, contentRef.current)
    const m = gridMetrics(frame, activeBoard.vizRowH ?? solveRowH(frame, DEFAULT_TOTAL_ROWS))
    const rows = maxRows(frame, m)
    const cells: Bounds[] = []
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < GRID.cols; col += 1) {
        cells.push(gridToPx({ col, row, colSpan: 1, rowSpan: 1 }, m))
      }
    }
    return cells
  }, [overlayOn, activeBoard.vizRowH, frameTick])

  return (
    <div
      className="app"
      data-testid="app-shell"
      // Clicks on app chrome (top bar, margins) deselect like canvas clicks.
      // Cards and the bottom bar stop propagation before this fires.
      onPointerDown={() => {
        if (selectedIds.length > 0) setSelectedIds([])
      }}
    >
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
              items={displayItems}
              selectedIds={selectedIds}
              editingId={editingId}
              tool={tool}
              showMobile={showMobile}
              onSelectOnly={selectOnly}
              onToggleSelect={toggleSelect}
              onSelectMany={setSelectedIds}
              onDragTo={dragItemTo}
              onDragEnd={endItemDrag}
              onResizeTo={resizeItemTo}
              onResizeEnd={commitGridDrag}
              onEdit={setEditingId}
              onItemChange={updateItem}
              onStroke={commitStroke}
              gridGhost={gridGhost}
              gridCells={gridCells}
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
        showGrid={showGrid}
        onToolChange={setTool}
        onInsert={insertItem}
        onDelete={deleteSelection}
        onToggleMobile={() => setShowMobile((prev) => !prev)}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
      />

      {/* Owned by App so it survives the composer unmounting mid-build */}
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
    </div>
  )
}
