import { useEffect, useRef, useState } from 'react'
import { onboardingRequest, type Bootstrap } from '../onboardingSync'
import { transitionView } from '../viewTransition'
import './WorkspaceInspector.css'

export default function CreateWorkspaceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (state: Bootstrap) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(crypto.randomUUID())
  const submitting = useRef(false)
  useEffect(() => { dialog.current?.showModal() }, [])
  const close = () => transitionView(onClose)
  const create = async () => {
    if (!name.trim() || submitting.current) return
    submitting.current = true
    transitionView(() => { setBusy(true); setError('') })
    try {
      const state = await onboardingRequest<Bootstrap>('/workspaces/create', { name: name.trim(), requestId: requestId.current })
      if (!state.organization) throw new Error('workspace-creation')
      transitionView(() => { onCreated(state); onClose() })
    } catch {
      transitionView(() => { setBusy(false); setError('Não foi possível criar o ambiente de trabalho. É possível tentar novamente.') })
    } finally { submitting.current = false }
  }
  return <dialog ref={dialog} className="workspace-name-dialog workspace-controls" aria-labelledby="create-workspace-title" onCancel={event => { event.preventDefault(); if (!busy) close() }}>
    <form onSubmit={event => { event.preventDefault(); void create() }}>
      <h2 id="create-workspace-title">Criar ambiente de trabalho</h2>
      <label className="wi-field">Nome<input autoFocus required maxLength={80} disabled={busy} value={name} onChange={event => setName(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <div className="workspace-name-actions"><button type="button" disabled={busy} onClick={close}>Cancelar</button><button className="wi-save" disabled={busy || !name.trim()}>{busy ? 'A criar…' : 'Criar ambiente'}</button></div>
    </form>
  </dialog>
}
