import { createClient } from '@supabase/supabase-js'

// Supabase consumes and clears implicit callback fragments during client initialization.
// Capture the values first so React can still distinguish recovery from ordinary sign-in.
const authCallback = new URLSearchParams(location.hash.slice(1))
export const authCallbackType = authCallback.get('type')
export const authCallbackError = authCallback.get('error_description')

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
