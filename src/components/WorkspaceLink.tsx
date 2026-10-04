import { useRef, useState, type MouseEvent } from 'react'
import { Star, StarFilled } from './icons'
import EditableName from './EditableName'
import FadingPageName from './FadingPageName'
import PageIcon from './PageIcon'
import WorkspaceDragHandle from './WorkspaceDragHandle'
import { toggleFavorite, useFavorites, type WorkspaceEntry } from '../workspaceFeedState'
import { transitionView } from '../viewTransition'

export default function WorkspaceLink({ workspace, href, selected, section, controlsVisible, ids, onRename, onMove, follow, onRemove }: {
  workspace: WorkspaceEntry; href: string; selected: boolean; section: 'favorites' | 'workspaces'; controlsVisible: boolean; ids: string[]
  onRename: (name: string) => void; onMove: (id: string, target: string, after: boolean) => void
  follow: (event: MouseEvent<HTMLAnchorElement>) => void; onRemove: () => void
}) {
  const link = useRef<HTMLAnchorElement>(null)
  const [renaming, setRenaming] = useState(false)
  const [error, setError] = useState('')
  const favorite = useFavorites().includes(href)
  const rename = () => transitionView(() => setRenaming(true))
  const FavoriteIcon = favorite ? StarFilled : Star
  return <div className="workspace-row" role="group" aria-label={workspace.name} data-workspace-id={workspace.id} data-sidebar-row={`${section}:${workspace.id}`} data-controls-visible={controlsVisible}>
    <div className="workspace-row-header" data-active={selected}>
      <span className="workspace-row-icon" aria-hidden="true"><PageIcon storageKey={workspace.storageKey} id="main" /></span>
      {renaming ? <EditableName autoEdit name={workspace.name} onSave={onRename} onFinish={() => { setRenaming(false); requestAnimationFrame(() => link.current?.focus()) }} /> :
        <a ref={link} className="workspace-row-link" href={href} onClick={follow} aria-current={selected ? 'page' : undefined} onKeyDown={event => {
          if (event.key === 'F2') { event.preventDefault(); rename() }
          if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); onRemove() }
        }}><FadingPageName>{workspace.name || 'Sem título'}</FadingPageName></a>}
      <div className="workspace-row-actions">
        <button type="button" className="workspace-favorite" aria-label={`${favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}: ${workspace.name}`} aria-pressed={favorite} onClick={() => transitionView(() => {
          try { toggleFavorite(href); setError('') } catch { setError('Não foi possível guardar o favorito.') }
        })}><FavoriteIcon size={14} aria-hidden="true" data-star-filled={favorite} /></button>
        <WorkspaceDragHandle id={workspace.id} name={workspace.name} ids={ids} onMove={onMove} />
      </div>
    </div>
    {error && <p className="workspace-row-error" role="alert">{error}</p>}
  </div>
}
