// Projects of the session's active organization. Sessions are minted by the
// fontes-auth Worker (github.com/MateusAMP2119/fontes-auth), so the cookie is
// validated by asking that Worker over the AUTH service binding; the project
// table shares its database (fontes-auth migrations/0002_organizations.sql)
// and is reached here through the AUTH_DB binding.

const AUTH_ORIGIN = 'https://builder.fonteslabs.com'
const PROJECT_NAME_MAX = 80

interface Session {
  session: { activeOrganizationId: string | null }
  user: { id: string }
}

// Better Auth answers get-session with the session or a bare `null`.
async function session(request: Request, env: Env): Promise<Session | null> {
  const cookie = request.headers.get('cookie')
  if (!cookie) return null
  const response = await env.AUTH.fetch(`${AUTH_ORIGIN}/api/auth/get-session`, { headers: { cookie } })
  if (!response.ok) return null
  return (await response.json()) as Session | null
}

// The signed-in user's membership of their active organization, or the
// response that ends the request: 401 without a session, 403 when the session
// names an organization the user no longer belongs to, an empty list when no
// organization is active yet (onboarding).
async function membership(request: Request, env: Env): Promise<{ organizationId: string } | Response> {
  const current = await session(request, env)
  if (!current) return new Response(null, { status: 401 })
  const organizationId = current.session.activeOrganizationId
  if (!organizationId) return Response.json([])
  const member = await env.AUTH_DB.prepare('SELECT 1 FROM member WHERE userId = ? AND organizationId = ?')
    .bind(current.user.id, organizationId)
    .first()
  if (!member) return new Response(null, { status: 403 })
  return { organizationId }
}

// Same-origin check for writes, standing in for the auth Worker's trusted
// origins. Browsers label the request themselves; the Origin header is the
// fallback for ones that do not.
function sameOrigin(request: Request) {
  const site = request.headers.get('sec-fetch-site')
  if (site) return site === 'same-origin'
  return request.headers.get('origin') === new URL(request.url).origin
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const scope = await membership(request, env)
  if (scope instanceof Response) return scope
  const { results } = await env.AUTH_DB.prepare(
    'SELECT id, organizationId, name, createdAt FROM project WHERE organizationId = ? ORDER BY createdAt',
  ).bind(scope.organizationId).all()
  return Response.json(results)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return new Response(null, { status: 403 })
  const scope = await membership(request, env)
  if (scope instanceof Response) return scope
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > PROJECT_NAME_MAX) return Response.json({ message: 'Nome inválido.' }, { status: 400 })
  const project = { id: crypto.randomUUID(), organizationId: scope.organizationId, name, createdAt: new Date().toISOString() }
  await env.AUTH_DB.prepare('INSERT INTO project (id, organizationId, name, createdAt) VALUES (?, ?, ?, ?)')
    .bind(project.id, project.organizationId, project.name, project.createdAt)
    .run()
  return Response.json(project, { status: 201 })
}
