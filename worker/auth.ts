import { betterAuth } from 'better-auth'
import { jwt, organization } from 'better-auth/plugins'

type AuthSecrets = {
  BETTER_AUTH_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  /** Local dev only: lets `wrangler dev` own the OAuth callback (e.g. http://localhost:5175). */
  BETTER_AUTH_URL?: string
}

type WorkerEnv = AuthBindings & AuthSecrets

const BASE_URL = 'https://builder.fonteslabs.com'
const FROM = { email: 'conta@fonteslabs.com', name: 'Fontes' }
const TRUSTED_ORIGINS = [BASE_URL, 'https://fontes-9lo.pages.dev', 'https://*.fontes-9lo.pages.dev']

function trustedOrigins(env: WorkerEnv) {
  return env.BETTER_AUTH_URL && !TRUSTED_ORIGINS.includes(env.BETTER_AUTH_URL)
    ? [...TRUSTED_ORIGINS, env.BETTER_AUTH_URL]
    : TRUSTED_ORIGINS
}
const PROJECT_NAME_MAX = 80

function isTrustedOrigin(origin: string | null, env: WorkerEnv) {
  if (!origin) return false
  return trustedOrigins(env).some((pattern) =>
    pattern.includes('*')
      ? new RegExp(`^${pattern.replaceAll('.', '\\.').replace('*', '[a-z0-9-]+')}$`).test(origin)
      : pattern === origin,
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function emailHtml(title: string, body: string, action: string, url: string) {
  const safeUrl = escapeHtml(url)
  return `<!doctype html>
<html lang="pt"><body style="margin:0;background:#f6f4fb;font-family:Arial,sans-serif;color:#17131f">
  <div style="max-width:520px;margin:0 auto;padding:44px 20px">
    <div style="background:#fff;border:1px solid #e8e3ef;border-radius:20px;padding:36px">
      <p style="font-size:22px;font-weight:700;margin:0 0 26px">Fontes</p>
      <h1 style="font-size:25px;line-height:1.25;margin:0 0 14px">${escapeHtml(title)}</h1>
      <p style="font-size:16px;line-height:1.55;color:#585061;margin:0 0 28px">${escapeHtml(body)}</p>
      <a href="${safeUrl}" style="display:inline-block;background:#17131f;color:#fff;text-decoration:none;border-radius:10px;padding:13px 20px;font-weight:600">${escapeHtml(action)}</a>
      <p style="font-size:12px;line-height:1.5;color:#82798c;margin:28px 0 0">Se não foste tu, podes ignorar este email.</p>
    </div>
  </div>
</body></html>`
}

function createAuth(env: WorkerEnv, waitUntil: (promise: Promise<unknown>) => void) {
  const baseURL = env.BETTER_AUTH_URL ?? BASE_URL
  return betterAuth({
    appName: 'Fontes',
    baseURL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: env.AUTH_DB,
    trustedOrigins: trustedOrigins(env),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await env.AUTH_EMAIL.send({
          to: user.email,
          from: FROM,
          subject: 'Recupera a tua palavra-passe — Fontes',
          html: emailHtml(
            'Recuperar palavra-passe',
            'Recebemos um pedido para definires uma nova palavra-passe na tua conta.',
            'Definir nova palavra-passe',
            url,
          ),
          text: `Define uma nova palavra-passe na tua conta Fontes: ${url}`,
        })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await env.AUTH_EMAIL.send({
          to: user.email,
          from: FROM,
          subject: 'Confirma a tua conta — Fontes',
          html: emailHtml(
            'Confirma o teu email',
            'Só falta confirmares este endereço para começares a usar a tua conta Fontes.',
            'Confirmar conta',
            url,
          ),
          text: `Confirma a tua conta Fontes: ${url}`,
        })
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60 * 60, max: 10 },
        '/request-password-reset': { window: 60 * 60, max: 5 },
        '/send-verification-email': { window: 60 * 60, max: 5 },
      },
    },
    plugins: [
      organization(),
      jwt({
        jwks: {
          jwksPath: '/.well-known/jwks.json',
          rotationInterval: 60 * 60 * 24 * 30,
          gracePeriod: 60 * 60 * 24 * 30,
        },
        jwt: {
          issuer: `${baseURL}/api/auth`,
          audience: 'authenticated',
          expirationTime: '15 minutes',
        },
      }),
    ],
    databaseHooks: {
      session: {
        create: {
          // A new session resumes the user's first organization, so the client derives
          // onboarding from data instead of from the URL it signed in on.
          before: async (session) => {
            const member = await env.AUTH_DB.prepare(
              'SELECT organizationId FROM member WHERE userId = ? ORDER BY createdAt LIMIT 1',
            ).bind(session.userId).first<{ organizationId: string }>()
            return { data: { ...session, activeOrganizationId: member?.organizationId ?? null } }
          },
        },
      },
    },
    advanced: {
      backgroundTasks: { handler: waitUntil },
      defaultCookieAttributes: {
        // Safari drops Secure cookies over plain http://localhost, so follow the base URL's scheme.
        secure: baseURL.startsWith('https://'),
        httpOnly: true,
        sameSite: 'lax',
      },
    },
  })
}

type Auth = ReturnType<typeof createAuth>

/**
 * Projects of the session's active organization. Lives here rather than in a Pages
 * Function because the project table shares AUTH_DB with the organization tables and
 * the cookie session is validated by the same Better Auth instance.
 */
async function projects(request: Request, env: WorkerEnv, auth: Auth): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') return new Response(null, { status: 405 })
  if (request.method === 'POST' && !isTrustedOrigin(request.headers.get('origin'), env)) {
    return new Response(null, { status: 403 })
  }
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(null, { status: 401 })
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) return Response.json([])
  const member = await env.AUTH_DB.prepare('SELECT 1 FROM member WHERE userId = ? AND organizationId = ?')
    .bind(session.user.id, organizationId)
    .first()
  if (!member) return new Response(null, { status: 403 })
  if (request.method === 'GET') {
    const { results } = await env.AUTH_DB.prepare(
      'SELECT id, organizationId, name, createdAt FROM project WHERE organizationId = ? ORDER BY createdAt',
    ).bind(organizationId).all()
    return Response.json(results)
  }
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > PROJECT_NAME_MAX) return Response.json({ message: 'Nome inválido.' }, { status: 400 })
  const project = { id: crypto.randomUUID(), organizationId, name, createdAt: new Date().toISOString() }
  await env.AUTH_DB.prepare('INSERT INTO project (id, organizationId, name, createdAt) VALUES (?, ?, ?, ?)')
    .bind(project.id, project.organizationId, project.name, project.createdAt)
    .run()
  return Response.json(project, { status: 201 })
}

export default {
  async fetch(request: Request, env: WorkerEnv, context: ExecutionContext): Promise<Response> {
    const auth = createAuth(env, (promise) => context.waitUntil(promise))
    try {
      if (new URL(request.url).pathname === '/api/projects') return await projects(request, env, auth)
      return await auth.handler(request)
    } catch (error) {
      console.error(JSON.stringify({
        event: 'auth_request_failed',
        method: request.method,
        path: new URL(request.url).pathname,
        error: error instanceof Error ? error.message : String(error),
      }))
      return Response.json({ message: 'Não foi possível concluir a autenticação.' }, { status: 500 })
    }
  },
} satisfies ExportedHandler<WorkerEnv>
