import { API } from './api'
import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields, emailOTPClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: API,
  fetchOptions: { credentials: 'include', timeout: 20000 },
  plugins: [
    emailOTPClient(),
    inferAdditionalFields({ user: { username: { type: 'string', required: false } } }),
  ],
})

export type AuthSession = typeof authClient.$Infer.Session
