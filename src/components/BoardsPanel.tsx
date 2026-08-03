import { useLayoutEffect, useRef, useState } from 'react'
import type { Board, Workspace } from '../workspace/workspace'
import {
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconSidebarToggle,
} from './icons'

type BoardsPanelProps = {
  open: boolean
  workspace: Workspace
  onToggle: () => void
  onProjectNameChange: (name: string) => void
  onSelectBoard: (id: string) => void
  onCreateBoard: () => void
  onCreateFolder: (name: string) => void
  onSetBoardFolder: (boardId: string, folderId: string | null) => void
}

/** Top-left pills; when open they become the header of the boards card. */
export function BoardsPanel({
  open,
  workspace,
  onToggle,
  onProjectNameChange,
  onSelectBoard,
  onCreateBoard,
  onCreateFolder,
  onSetBoardFolder,
}: BoardsPanelProps) {
  const [folderDraft, setFolderDraft] = useState<string | null>(null)
  const [dropFolderId, setDropFolderId] = useState<string | null>(null)

  const activeBoard =
    workspace.boards.find((b) => b.id === workspace.activeId) ?? workspace.boards[0]

  // The input can't animate its intrinsic width, so a hidden mirror measures
  // the name and the sizer transitions to that explicit width.
  const mirrorRef = useRef<HTMLSpanElement>(null)
  const [titleWidth, setTitleWidth] = useState<number>()
  useLayoutEffect(() => {
    if (mirrorRef.current) setTitleWidth(mirrorRef.current.offsetWidth)
  }, [activeBoard.name])

  const commitFolder = () => {
    if (folderDraft?.trim()) onCreateFolder(folderDraft.trim())
    setFolderDraft(null)
  }

  const draggedBoardId = (e: React.DragEvent) =>
    e.dataTransfer.getData('text/plain')

  const looseBoards = workspace.boards.filter((b) => b.folderId === null)

  const renderBoard = (board: Board) => (
    <BoardRow
      key={board.id}
      board={board}
      active={board.id === workspace.activeId}
      onSelect={() => onSelectBoard(board.id)}
    />
  )

  return (
    <div className="chrome-title" data-testid="title-chip">
      <div
        className={`boards-morph${open ? ' is-open' : ''}`}
        data-testid="boards-panel"
      >
        <div className="morph-head">
          <div className="pill glass morph-pill">
            <button
              type="button"
              className="pill-btn"
              title={open ? 'Close boards' : 'Boards'}
              data-testid="sidebar-toggle"
              onClick={onToggle}
            >
              <IconSidebarToggle size={17} open={open} />
              <span className="sr-only">{open ? 'Close boards' : 'Boards'}</span>
            </button>
          </div>

          <div className="pill glass morph-pill title-pill">
            <label
              className="title-sizer"
              style={titleWidth ? { width: titleWidth } : undefined}
            >
              <span className="title-mirror" aria-hidden="true" ref={mirrorRef}>
                {activeBoard.name || ' '}
              </span>
              <span className="sr-only">Board name</span>
              <input
                type="text"
                className="project-name-input"
                data-testid="project-name"
                value={activeBoard.name}
                size={1}
                onChange={(e) => onProjectNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    e.currentTarget.blur()
                  }
                }}
                onBlur={() => {
                  if (!activeBoard.name.trim()) onProjectNameChange('Untitled')
                }}
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              className="pill-btn"
              title="New page"
              data-testid="new-board"
              onClick={onCreateBoard}
            >
              <IconPlus size={17} />
              <span className="sr-only">New page</span>
            </button>
          </div>

          <div className="morph-head-actions">
            <button
              type="button"
              className="pill-btn"
              title="New folder"
              tabIndex={open ? 0 : -1}
              onClick={() => setFolderDraft('')}
            >
              <IconFolderPlus size={17} />
              <span className="sr-only">New folder</span>
            </button>
          </div>
        </div>

        <div className="morph-body" aria-hidden={!open}>
          <div className="morph-body-clip">
            {/* Dropping on the list background (outside any folder) unfiles the board */}
            <div
              className="morph-list"
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDropFolderId(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = draggedBoardId(e)
                if (id) onSetBoardFolder(id, null)
                setDropFolderId(null)
              }}
            >
              {folderDraft !== null && (
                <input
                  className="sidebar-folder-input"
                  value={folderDraft}
                  placeholder="Folder name"
                  autoFocus
                  onChange={(e) => setFolderDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitFolder()
                    if (e.key === 'Escape') setFolderDraft(null)
                  }}
                  onBlur={commitFolder}
                />
              )}

              {workspace.folders.map((folder) => (
                <section
                  className={`sidebar-section${
                    dropFolderId === folder.id ? ' is-drop-target' : ''
                  }`}
                  key={folder.id}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'move'
                    setDropFolderId(folder.id)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const id = draggedBoardId(e)
                    if (id) onSetBoardFolder(id, folder.id)
                    setDropFolderId(null)
                  }}
                >
                  <div className="sidebar-folder-head">
                    <IconFolder size={14} />
                    <span>{folder.name}</span>
                  </div>
                  {workspace.boards
                    .filter((b) => b.folderId === folder.id)
                    .map(renderBoard)}
                </section>
              ))}

              <section className="sidebar-section">
                {workspace.folders.length > 0 && looseBoards.length > 0 && (
                  <div className="sidebar-folder-head">
                    <span>Boards</span>
                  </div>
                )}
                {looseBoards.map(renderBoard)}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type BoardRowProps = {
  board: Board
  active: boolean
  onSelect: () => void
}

function BoardRow({ board, active, onSelect }: BoardRowProps) {
  const [dragging, setDragging] = useState(false)

  return (
    <div
      className={`board-row${active ? ' is-active' : ''}${
        dragging ? ' is-dragging' : ''
      }`}
      data-testid="board-row"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', board.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
    >
      <div className="board-row-line">
        <button
          type="button"
          className="board-row-name"
          onClick={onSelect}
          title={board.name || 'Untitled'}
        >
          {board.name || 'Untitled'}
        </button>
      </div>
    </div>
  )
}
