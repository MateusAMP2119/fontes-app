// Secrets are not in wrangler.jsonc, so `wrangler types` leaves them out of
// Env (worker-configuration.d.ts); declared here, merged into the same Env.
interface Env {
  /** Shared with the engine: `wrangler pages secret put SYNC_KEY`, FONTES_SYNC_KEY on tiger. */
  SYNC_KEY: string
}
