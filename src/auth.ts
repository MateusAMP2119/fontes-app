import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields, jwtClient, organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: location.origin,
  plugins: [
    jwtClient({ jwks: { jwksPath: '/.well-known/jwks.json' } }),
    organizationClient(),
    inferAdditionalFields({ user: { username: { type: 'string', required: false } } }),
  ],
})

// ponytail: false hides the login link, the /login route and the session fetch; flip for a kill switch
export const AUTH_ENABLED = true

export type AuthSession = typeof authClient.$Infer.Session
