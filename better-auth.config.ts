import { betterAuth } from 'better-auth'
import { jwt, organization } from 'better-auth/plugins'
import Database from 'better-sqlite3'

// Schema-only configuration used by `npx auth generate`. Runtime bindings are
// supplied by functions/auth.ts inside Cloudflare Pages Functions.
export const auth = betterAuth({
  baseURL: 'https://builder.fonteslabs.com',
  database: new Database(':memory:'),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  rateLimit: { enabled: true, storage: 'database' },
  plugins: [jwt(), organization()],
})
