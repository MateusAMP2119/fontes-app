import { createAuthClient } from 'better-auth/react'
import { jwtClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: location.origin,
  plugins: [jwtClient({ jwks: { jwksPath: '/.well-known/jwks.json' } })],
})

// ponytail: flip to true when the account flow ships; hides the login link, the /login route and the session fetch
export const AUTH_ENABLED = false

export type AuthSession = typeof authClient.$Infer.Session
