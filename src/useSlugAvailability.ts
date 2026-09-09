import { useEffect, useRef, useState } from 'react'
import { onboardingRequest } from './onboardingSync'

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'unavailable'
export function useSlugAvailability(slug: string, userId?: string, organizationId?: string) {
  const cache = useRef(new Map<string, { available: boolean; at: number }>())
  const [result, setResult] = useState<{ key: string; status: Status }>({ key: '', status: 'idle' })
  const key = `${userId || ''}:${organizationId || ''}:${slug}`
  const enabled = !!userId && /^[a-z0-9][a-z0-9-]{2,47}$/.test(slug)
  useEffect(() => {
    if (!enabled) return
    let active = true
    const controller = new AbortController()
    const cached = cache.current.get(key)
    if (cached && Date.now() - cached.at < 30000) {
      setResult({ key, status: cached.available ? 'available' : 'taken' })
      return
    }
    const timer = setTimeout(async () => {
      setResult({ key, status: 'checking' })
      try {
        const data = await onboardingRequest<{ available: boolean }>('/availability', { slug, organizationId }, controller.signal)
        if (!active) return
        if (typeof data.available !== 'boolean') throw new Error('Invalid availability response')
        if (cache.current.size >= 64) cache.current.clear()
        cache.current.set(key, { available: data.available, at: Date.now() })
        setResult({ key, status: data.available ? 'available' : 'taken' })
      } catch { if (active) setResult({ key, status: 'unavailable' }) }
    }, 350)
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [enabled, key, slug, organizationId])
  return enabled ? result.key === key ? result.status : 'checking' : 'idle'
}
