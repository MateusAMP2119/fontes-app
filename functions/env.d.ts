// Bindings from wrangler.jsonc plus the Pages project's secrets.
interface Env {
  DB: D1Database
  /** Shared with the engine's stories-sync worker; `wrangler pages secret put SYNC_KEY`. */
  SYNC_KEY: string
}
