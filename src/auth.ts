import { API } from './api'
import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields, jwtClient, organizationClient, emailOTPClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: API,
  fetchOptions: { credentials: 'include', timeout: 20000 },
  plugins: [
    jwtClient({ jwks: { jwksPath: '/.well-known/jwks.json' } }),
    organizationClient(),
    emailOTPClient(),
    inferAdditionalFields({ user: { username: { type: 'string', required: false } } }),
  ],
})

// ponytail: false hides the login link, the /login route and the session fetch; flip for a kill switch
export const AUTH_ENABLED = true

export type AuthSession = typeof authClient.$Infer.Session
