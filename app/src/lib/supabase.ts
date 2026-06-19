import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase environment variables. ' +
      'Copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  );
}

/**
 * Singleton Supabase client for the browser.
 * Handles auth (session storage, refresh) and is used directly for
 * Supabase Auth flows (sign in/up/out, OAuth, session retrieval).
 *
 * Data access for application tables goes through the Next.js API routes
 * (see src/lib/api/*) rather than directly through this client, so that
 * server-side validation, XP awarding, and rate limiting are enforced.
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
