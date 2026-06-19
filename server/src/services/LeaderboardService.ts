import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { toCamel } from '@/lib/utils/case';
import { periodBounds } from './ReportService';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

const PROFILE_SUMMARY = 'id, username, display_name, avatar_url, rank, level';

/**
 * Returns leaderboard entries for a period. Prefers the cached
 * `leaderboard_snapshots` table (rebuilt by /api/internal/cron/leaderboard);
 * if no snapshot exists for the current period_start (e.g. cron hasn't run
 * yet today), computes ranks on-the-fly from `xp_transactions`.
 *
 * WHY admin client for on-the-fly:
 *   `xp_transactions` RLS only allows `user_id = auth.uid()` — each user
 *   can only read their own rows. Computing a global leaderboard requires
 *   reading ALL users' transactions, so we use the admin (service-role)
 *   client which bypasses RLS. The user is already authenticated by
 *   requireAuth() in the route before this service is called.
 *
 *   Similarly, `profiles` RLS filters by `is_public = true OR id = auth.uid()`,
 *   which would hide private profiles from leaderboard results. We use admin
 *   here too so private-profile users still appear on the leaderboard.
 */
export async function getLeaderboard(
  supabase: SupabaseClient,
  period: Period,
  page: number,
  limit: number,
  userIds?: string[]
): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
  const { start } = periodBounds(period);

  // Snapshots are written by service_role (cron job) so they're readable
  // by all authenticated users via the leaderboard_select_all RLS policy.
  // The user-scoped client is fine here.
  if (!userIds) {
    const { data: snapshots, count } = await supabase
      .from('leaderboard_snapshots')
      .select('*', { count: 'exact' })
      .eq('period', period)
      .eq('period_start', start)
      .order('rank_position', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (snapshots && snapshots.length > 0) {
      // Use admin to fetch profiles so private-profile users show up too.
      const admin = createAdminClient();
      const ids = snapshots.map((s: { user_id: string }) => s.user_id);
      const { data: profiles } = await admin.from('profiles').select(PROFILE_SUMMARY).in('id', ids);
      const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));

      const data = snapshots.map((s: Record<string, unknown>) => ({
        userId: s.user_id,
        profile: toCamel(profileMap.get(s.user_id as string)),
        rankPosition: s.rank_position,
        xpEarned: s.xp_earned,
        period,
        periodStart: start,
      }));

      return { data, total: count ?? 0 };
    }
  }

  // Fallback: compute on-the-fly from xp_transactions.
  // Must use admin client — xp_transactions RLS restricts reads to own rows only.
  return computeLeaderboardOnTheFly(period, start, page, limit, userIds);
}

async function computeLeaderboardOnTheFly(
  period: Period,
  periodStart: string,
  page: number,
  limit: number,
  userIds?: string[]
): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
  // Admin client bypasses RLS so we can aggregate across all users.
  const admin = createAdminClient();

  let query = admin
    .from('xp_transactions')
    .select('user_id, amount')
    .gte('created_at', `${periodStart}T00:00:00Z`);

  if (userIds && userIds.length > 0) {
    query = query.in('user_id', userIds);
  }

  const { data: txRows, error } = await query;
  if (error) throw error;

  const totals = new Map<string, number>();
  for (const row of (txRows ?? []) as Array<{ user_id: string; amount: number }>) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + Math.max(0, row.amount));
  }

  // Ensure all requested userIds appear even with 0 XP (for friends leaderboard).
  if (userIds) {
    for (const id of userIds) if (!totals.has(id)) totals.set(id, 0);
  }

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const total = sorted.length;
  const page_ = sorted.slice((page - 1) * limit, page * limit);

  const ids = page_.map(([id]) => id);
  const { data: profiles } = await admin
    .from('profiles')
    .select(PROFILE_SUMMARY)
    .in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']);
  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));

  const data = page_.map(([userId, xpEarned], idx) => ({
    userId,
    profile: toCamel(profileMap.get(userId)),
    rankPosition: (page - 1) * limit + idx + 1,
    xpEarned,
    period,
    periodStart,
  }));

  return { data, total };
}
