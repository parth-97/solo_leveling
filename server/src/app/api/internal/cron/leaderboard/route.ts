import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/utils/cronAuth';
import { withErrorHandling, jsonOk } from '@/lib/utils/response';
import { createAdminClient } from '@/lib/supabase/admin';
import { periodBounds } from '@/services/ReportService';

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

/**
 * POST /api/internal/cron/leaderboard
 *
 * Rebuilds `leaderboard_snapshots` for the current daily/weekly/monthly/
 * yearly period windows by summing positive xp_transactions per user
 * within each window and ranking by total XP descending.
 *
 * GET /leaderboard falls back to computing on-the-fly if no snapshot
 * exists for "today's" period_start, so this cron is an optimization
 * (avoids per-request full-table scans of xp_transactions) rather than
 * a hard dependency.
 *
 * Schedule: hourly or daily depending on desired leaderboard freshness.
 *
 * Trigger:
 *   POST /api/internal/cron/leaderboard
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    requireCronAuth(request);

    const supabase = createAdminClient();
    const results: Record<string, number> = {};

    for (const period of PERIODS) {
      const { start } = periodBounds(period);

      const { data: txRows, error } = await supabase.from('xp_transactions').select('user_id, amount').gte('created_at', `${start}T00:00:00Z`);
      if (error) throw error;

      const totals = new Map<string, number>();
      for (const row of (txRows ?? []) as Array<{ user_id: string; amount: number }>) {
        totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + Math.max(0, row.amount));
      }

      const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);

      if (sorted.length === 0) {
        results[period] = 0;
        continue;
      }

      const userIds = sorted.map(([id]) => id);
      const { data: profiles } = await supabase.from('profiles').select('id, level, rank').in('id', userIds);
      const profileMap = new Map((profiles ?? []).map((p: { id: string; level: number; rank: string }) => [p.id, p]));

      const rows = sorted.map(([userId, xpEarned], idx) => {
        const profile = profileMap.get(userId);
        return {
          period,
          period_start: start,
          user_id: userId,
          rank_position: idx + 1,
          xp_earned: xpEarned,
          level: profile?.level ?? 1,
          rank_tier: profile?.rank ?? 'E',
        };
      });

      // Clear existing snapshot rows for this period_start, then insert fresh ones.
      await supabase.from('leaderboard_snapshots').delete().eq('period', period).eq('period_start', start);
      const { error: insertError } = await supabase.from('leaderboard_snapshots').insert(rows);
      if (insertError) throw insertError;

      results[period] = rows.length;
    }

    return jsonOk({ rebuilt: results }, { origin });
  });
}
