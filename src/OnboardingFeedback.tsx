export function Icon({ kind }: { kind: 'email' | 'link' | 'arrow' | 'camera' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === 'camera' ? <><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1 1 0 0 0 .8-.4l.9-1.2a1 1 0 0 1 .8-.4h5.6a1 1 0 0 1 .8.4l.9 1.2a1 1 0 0 0 .8.4h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/><circle cx="12" cy="12.5" r="3.4"/></> : kind === 'email' ? <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></> : kind === 'link' ? <><path d="m10 13 4-4m-6 5-1 1a3.5 3.5 0 0 0 5 5l4-4a3.5 3.5 0 0 0 0-5m0-1 1-1a3.5 3.5 0 0 0-5-5l-4 4a3.5 3.5 0 0 0 0 5"/></> : <path d="m9 5 7 7-7 7"/>}</svg>
}

export function FieldError({ id, message, hint, hintId }: { id: string; message?: string; hint?: string; hintId?: string }) {
  return <span className="ob-field-feedback">
    {message ? <small id={id} className="ob-field-error" role="alert">{message}</small> : hint ? <small id={hintId} className="ob-field-hint">{hint}</small> : null}
  </span>
}

export function Toast({ message, error = false, onDismiss }: { message: string; error?: boolean; onDismiss: () => void }) {
  return <div className="ob-toast" data-tone={error ? 'error' : 'info'}>
    <svg className="ob-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></svg>
    <p role={error ? 'alert' : 'status'}>{message}</p>
    <button type="button" aria-label="Fechar notificação" onClick={onDismiss}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
  </div>
}
