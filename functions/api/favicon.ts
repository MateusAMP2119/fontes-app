// A publisher's favicon from our own origin. The feed used to load these
// straight from Google's s2 service, which redirects to gstatic.com; phones
// behind tracker-blocking DNS or a filtering VPN drop that chain and the
// logos vanish. Fetched once at the edge, cached a week, served same-origin.

const UPSTREAMS = (host: string) => [
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
  `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
]
const CACHE = 'public, max-age=86400, s-maxage=604800'

export const onRequestGet: PagesFunction = async ({ request, waitUntil }) => {
  const host = (new URL(request.url).searchParams.get('host') ?? '').toLowerCase()
  if (!/^[a-z0-9.-]{1,253}$/.test(host)) return new Response(null, { status: 400 })
  const cache = caches.default
  const hit = await cache.match(request)
  if (hit) return hit
  for (const upstream of UPSTREAMS(host)) {
    try {
      const response = await fetch(upstream)
      const type = response.headers.get('Content-Type') ?? ''
      if (!response.ok || !type.startsWith('image/')) continue
      const icon = new Response(response.body, { headers: { 'Content-Type': type, 'Cache-Control': CACHE } })
      waitUntil(cache.put(request, icon.clone()))
      return icon
    } catch {
      // upstream down or slow: try the next one
    }
  }
  return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=3600' } })
}
