/** Retry read-only requests until they succeed or their view is cancelled. */
export async function retryRead<T>(read: () => Promise<T>, signal: AbortSignal): Promise<T> {
  let delay = 5000
  for (;;) {
    signal.throwIfAborted()
    try {
      const result = await read()
      signal.throwIfAborted()
      return result
    } catch {
      signal.throwIfAborted()
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(signal.reason) }
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, delay)
        signal.addEventListener('abort', abort, { once: true })
      })
      delay = Math.min(delay * 2, 30000)
    }
  }
}
