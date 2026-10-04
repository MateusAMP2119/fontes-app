import { useCallback, useState, useSyncExternalStore } from 'react'
import { Popover } from 'radix-ui'
import { FileDocument, NewsPaper, Home, Analytics, BarChart, Chart, Lightbulb, Search, Tag, Members, Folder, Sparkles, Clock, AllGizmos, type IconProps } from './icons'
import { transitionView } from '../viewTransition'
import './PageIcon.css'

const choices = [
  ['document', 'Documento', FileDocument], ['news', 'Notícias', NewsPaper],
  ['home', 'Início', Home], ['analytics', 'Análise', Analytics],
  ['bars', 'Mercados', BarChart], ['chart', 'Gráfico', Chart],
  ['idea', 'Ideia', Lightbulb], ['search', 'Pesquisa', Search],
  ['tag', 'Tema', Tag], ['people', 'Equipa', Members],
  ['folder', 'Pasta', Folder], ['sparkles', 'Destaques', Sparkles],
  ['clock', 'Atualidade', Clock], ['grid', 'Visão geral', AllGizmos],
] as const
const changed = 'fontes:page-icon-changed'
function subscribe(callback: () => void) {
  window.addEventListener(changed, callback)
  window.addEventListener('storage', callback)
  return () => { window.removeEventListener(changed, callback); window.removeEventListener('storage', callback) }
}

export default function PageIcon({ storageKey, id, title = 'página', editable = false, className, size = 16 }: {
  storageKey: string; id: string; title?: string; editable?: boolean; className?: string; size?: IconProps['size']
}) {
  const key = `${storageKey}:icon:${id}`
  const value = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key) } catch { return null }
  }, () => null)
  const selected = choices.find(([name]) => name === value) ?? choices[0]
  const Icon = selected[2]
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const triggerRef = useCallback((node: HTMLButtonElement | null) => { setContainer(node?.closest<HTMLElement>('.dashboard') ?? null) }, [])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  if (!editable) return <Icon size={size} data-page-icon={selected[0]} />
  return <Popover.Root open={open} onOpenChange={next => transitionView(() => { setOpen(next); setError(false) })}>
    <Popover.Trigger asChild><button ref={triggerRef} type="button" className={`page-icon-picker ${className ?? ''}`} aria-label={`Alterar ícone: ${title}`} onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}><Icon size={size} data-page-icon={selected[0]} /></button></Popover.Trigger>
    <Popover.Portal container={container}><Popover.Content className="page-icon-popover" align="start" alignOffset={-8} sideOffset={8} collisionPadding={12} aria-label="Ícone da página" onClick={event => event.stopPropagation()}>
      <div className="page-icon-grid">{choices.map(([name, label, Option]) => <button type="button" key={name} aria-label={label} aria-pressed={selected[0] === name} onClick={() => {
        try {
          localStorage.setItem(key, name)
          transitionView(() => { window.dispatchEvent(new Event(changed)); setOpen(false); setError(false) })
        } catch { setError(true) }
      }}><Option size={18} /></button>)}
      </div>
      {error && <p role="alert">Não foi possível guardar o ícone neste navegador.</p>}
    </Popover.Content></Popover.Portal>
  </Popover.Root>
}
