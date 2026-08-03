import { useLayoutEffect, useRef, useState } from 'react'
import type { Board, Folder, Workspace } from '../workspace/workspace'
import {
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconSidebarToggle,
  IconTag,
  IconX,
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
  onAddTag: (boardId: string, tag: string) => void
  onRemoveTag: (boardId: string, tag: string) => void
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
  onAddTag,
  onRemoveTag,
}: BoardsPanelProps) {
  const [folderDraft, setFolderDraft] = useState<string | null>(null)
  const [taggingId, setTaggingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

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

  const looseBoards = workspace.boards.filter((b) => b.folderId === null)

  const renderBoard = (board: Board) => (
    <BoardRow
      key={board.id}
      board={board}
      folders={workspace.folders}
      active={board.id === workspace.activeId}
      tagging={taggingId === board.id}
      moving={movingId === board.id}
      onSelect={() => onSelectBoard(board.id)}
      onStartTag={() => {
        setTaggingId(board.id)
        setMovingId(null)
      }}
      onEndTag={() => setTaggingId(null)}
      onToggleMove={() => {
        setMovingId(movingId === board.id ? null : board.id)
        setTaggingId(null)
      }}
      onMove={(folderId) => {
        onSetBoardFolder(board.id, folderId)
        setMovingId(null)
      }}
      onAddTag={(tag) => onAddTag(board.id, tag)}
      onRemoveTag={(tag) => onRemoveTag(board.id, tag)}
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
            <div className="morph-list">
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
                <section className="sidebar-section" key={folder.id}>
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
  folders: Folder[]
  active: boolean
  tagging: boolean
  moving: boolean
  onSelect: () => void
  onStartTag: () => void
  onEndTag: () => void
  onToggleMove: () => void
  onMove: (folderId: string | null) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}

function BoardRow({
  board,
  folders,
  active,
  tagging,
  moving,
  onSelect,
  onStartTag,
  onEndTag,
  onToggleMove,
  onMove,
  onAddTag,
  onRemoveTag,
}: BoardRowProps) {
  const [tagDraft, setTagDraft] = useState('')

  const commitTag = () => {
    if (tagDraft.trim()) onAddTag(tagDraft)
    setTagDraft('')
    onEndTag()
  }

  return (
    <div className={`board-row${active ? ' is-active' : ''}`} data-testid="board-row">
      <div className="board-row-line">
        <button
          type="button"
          className="board-row-name"
          onClick={onSelect}
          title={board.name || 'Untitled'}
        >
          {board.name || 'Untitled'}
        </button>
        <div className="board-row-actions">
          <button
            type="button"
            className="board-row-btn"
            title="Move to folder"
            onClick={onToggleMove}
          >
            <IconFolder size={14} />
            <span className="sr-only">Move to folder</span>
          </button>
          <button
            type="button"
            className="board-row-btn"
            title="Add tag"
            onClick={onStartTag}
          >
            <IconTag size={14} />
            <span className="sr-only">Add tag</span>
          </button>
        </div>
      </div>

      {(board.tags.length > 0 || tagging) && (
        <div className="board-row-tags">
          {board.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="tag-chip"
              title={`Remove tag ${tag}`}
              onClick={() => onRemoveTag(tag)}
            >
              {tag}
              <IconX size={9} />
            </button>
          ))}
          {tagging && (
            <input
              className="tag-input"
              value={tagDraft}
              placeholder="tag"
              autoFocus
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTag()
                if (e.key === 'Escape') onEndTag()
              }}
              onBlur={commitTag}
            />
          )}
        </div>
      )}

      {moving && (
        <div className="board-row-move">
          <button
            type="button"
            className={`move-option${board.folderId === null ? ' is-current' : ''}`}
            onClick={() => onMove(null)}
          >
            No folder
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className={`move-option${board.folderId === folder.id ? ' is-current' : ''}`}
              onClick={() => onMove(folder.id)}
            >
              <IconFolder size={13} />
              {folder.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
