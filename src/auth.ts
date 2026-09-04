import { createAuthClient } from 'better-auth/react'
import { jwtClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: location.origin,
  plugins: [jwtClient({ jwks: { jwksPath: '/.well-known/jwks.json' } })],
})

export type AuthSession = typeof authClient.$Infer.Session
