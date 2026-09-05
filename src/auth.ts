import { createAuthClient } from 'better-auth/react'
import { jwtClient, organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: location.origin,
  plugins: [jwtClient({ jwks: { jwksPath: '/.well-known/jwks.json' } }), organizationClient()],
})

// ponytail: false hides the login link, the /login route and the session fetch; flip for a kill switch
export const AUTH_ENABLED = true

export type AuthSession = typeof authClient.$Infer.Session
