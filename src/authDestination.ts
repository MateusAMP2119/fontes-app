/** Carry same-origin reading context through password recovery and login. */
export function recoveryURL() {
  const url = new URL(location.href)
  if (!['/login', '/reset-password', '/account/password'].includes(url.pathname)) url.searchParams.set('returnTo', url.pathname + url.search + url.hash)
  url.pathname = '/reset-password'
  url.searchParams.delete('error')
  return url.pathname + url.search
}
export function restoreDestination() {
  const current = new URL(location.href)
  const target = current.searchParams.get('returnTo')
  if (!target && current.pathname !== '/login') return
  let destination = new URL('/', current.origin)
  if (target?.startsWith('/') && !target.startsWith('//')) {
    try {
      const parsed = new URL(target, current.origin)
      if (parsed.origin === current.origin && !['/login', '/reset-password', '/account/password'].includes(parsed.pathname)) destination = parsed
    } catch { /* Invalid destinations return to the workspace. */ }
  }
  for (const key of ['invite', 'returnTo', 'error', 'token']) destination.searchParams.delete(key)
  history.replaceState(null, '', destination.pathname + destination.search + destination.hash)
  queueMicrotask(() => dispatchEvent(new PopStateEvent('popstate')))
}
