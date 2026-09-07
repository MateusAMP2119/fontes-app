/** Public API origin; Vite embeds this value in the browser bundle. */
export const API = (import.meta.env.VITE_API_URL || 'https://api.fonteslabs.com').replace(/\/+$/, '')

/** News may be hosted separately from authentication and projects. */
export const NEWS_API = (import.meta.env.VITE_NEWS_API_URL || 'https://fontes-api.bymarreco.com').replace(/\/+$/, '')
