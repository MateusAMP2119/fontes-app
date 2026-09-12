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

// ponytail: false hides the login link, the /login route and the session fetch; flip for a kill switch
export const AUTH_ENABLED = true

export type AuthSession = typeof authClient.$Infer.Session

/** Google sign-in requires the production API and an HTTPS frontend. */
export const GOOGLE_SIGN_IN_ENABLED = API === 'https://api.fonteslabs.com' && location.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
