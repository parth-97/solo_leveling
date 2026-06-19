import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS entirely.
 *
 * Use ONLY for:
 *  - `award_xp` and other SECURITY DEFINER RPCs that must run regardless
 *    of the calling user's row visibility (they already scope by p_user_id).
 *  - Internal cron endpoints (/api/internal/*) protected by CRON_SECRET.
 *  - Operations that legitimately need to read/write across users
 *    (e.g. inserting into another user's notifications/activity_feed).
 *
 * NEVER use this client to fetch data that should be filtered by RLS
 * for the calling user (e.g. "list my goals") — use the request-scoped
 * client from server.ts instead, so RLS enforces `user_id = auth.uid()`.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
