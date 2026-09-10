import { authClient, type AuthSession } from './auth'

export class GoogleSignInError extends Error {}

/** Keep the original document and destination mounted throughout OAuth. */
export async function googleSignIn(prepare: (session: AuthSession) => Promise<void>, signal: AbortSignal) {
  const attempt = crypto.randomUUID()
  const callback = new URL('/google-auth.html', location.origin)
  callback.searchParams.set('attempt', attempt)
  const popup = window.open(callback.href, `fontes-google-${attempt}`, 'popup,width=500,height=640')
  if (!popup) throw new GoogleSignInError('A janela de início de sessão foi bloqueada pelo navegador. Nova tentativa disponível.')
  callback.searchParams.set('complete', '1')
  const channel = new BroadcastChannel(`fontes-google-${attempt}`)
  let cleanup = () => {}
  try {
    await new Promise<void>((resolve, reject) => {
      let finished = false
      const finish = (error?: Error) => {
        if (finished) return
        finished = true; cleanup()
        if (error) reject(error); else resolve()
      }
      const receive = (data: unknown) => {
        if (!data || typeof data !== 'object' || !('attempt' in data) || data.attempt !== attempt || !('type' in data)) return
        if (data.type === 'complete') finish()
        if (data.type === 'error') finish(new GoogleSignInError('O início de sessão com Google não foi concluído. Nova tentativa disponível.'))
        if (data.type === 'cancel') finish(new GoogleSignInError('Início de sessão cancelado. Nova tentativa disponível.'))
      }
      const message = (event: MessageEvent) => { if (event.origin === location.origin && event.source === popup) receive(event.data) }
      const abort = () => finish(new GoogleSignInError('Início de sessão cancelado.'))
      channel.onmessage = event => receive(event.data)
      addEventListener('message', message)
      signal.addEventListener('abort', abort, { once: true })
      // Safari can report `closed` during provider window isolation. Only an
      // explicit cancellation or timeout ends the attempt; the return channel
      // remains live even when the original WindowProxy has been disconnected.
      const timeout = setTimeout(() => finish(new GoogleSignInError('O início de sessão expirou. Nova tentativa disponível.')), 180000)
      cleanup = () => { clearTimeout(timeout); removeEventListener('message', message); signal.removeEventListener('abort', abort); channel.onmessage = null }
      if (signal.aborted) { abort(); return }
      void authClient.signIn.social({ provider: 'google', callbackURL: callback.href, errorCallbackURL: callback.href, disableRedirect: true }).then(result => {
        if (finished) return
        if (result.error || !result.data?.url) { finish(new Error('Google sign-in unavailable')); return }
        const url = new URL(result.data.url)
        // The URL comes from our auth server. Reject non-web navigation schemes.
        if (!['https:', 'http:'].includes(url.protocol)) { finish(new Error('Invalid OAuth URL')); return }
        popup.location.href = url.href
      }).catch(() => finish(new Error('Google sign-in unavailable')))
    })
    if (signal.aborted) return
    // Return to the original frozen form immediately. Setup continues there.
    channel.postMessage({ type: 'close', attempt })
    popup.close()
    window.focus()
    // A callback is only a wake-up signal. Session identity always comes from the API.
    await authClient.$store.atoms.session.get().refetch()
    const session = authClient.$store.atoms.session.get().data
    if (!session || signal.aborted) throw new Error('Google session unavailable')
    await prepare(session)
  } finally {
    cleanup()
    channel.postMessage({ type: 'close', attempt })
    channel.close()
    popup.close()
    window.focus()
  }
}
