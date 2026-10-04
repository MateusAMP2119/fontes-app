import { Camera, Email, Link, ChevronRight, ExclamationMarkCircle, X } from './components/icons'
import './Toast.css'

export function Icon({ kind }: { kind: 'email' | 'link' | 'arrow' | 'camera' }) {
  const Component = { camera: Camera, email: Email, link: Link, arrow: ChevronRight }[kind]
  return <Component size={18} />
}

export function FieldError({ id, message, hint, hintId }: { id: string; message?: string; hint?: string; hintId?: string }) {
  return <span className="ob-field-feedback">
    {message ? <small id={id} className="ob-field-error" role="alert">{message}</small> : hint ? <small id={hintId} className="ob-field-hint">{hint}</small> : null}
  </span>
}

export function Toast({ message, error = false, onDismiss, action }: { message: string; error?: boolean; onDismiss: () => void; action?: { label: string; onClick: () => void } }) {
  return <div className="ob-toast" data-tone={error ? 'error' : 'info'}>
    <ExclamationMarkCircle className="ob-toast-icon" size={18} />
    <p role={error ? 'alert' : 'status'}>{message}</p>
    {action && <button type="button" className="ob-toast-action" onClick={action.onClick}>{action.label}</button>}
    <button type="button" aria-label="Fechar notificação" onClick={onDismiss}><X size={14} /></button>
  </div>
}
