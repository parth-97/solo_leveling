import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/utils/cronAuth';
import { withErrorHandling, jsonOk } from '@/lib/utils/response';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/internal/cron/streaks
 *
 * Runs `recalculate_streak` (files/03_analytics_engine.sql) for every
 * user. This is the safety net that resets `profiles.current_streak`
 * to 0 for users who had no qualifying activity yesterday — without
 * this cron, a user's streak would only update the next time they
 * interact with the app (via habit log / quest complete), which means
 * a broken streak could display stale until their next visit.
 *
 * Schedule: once daily, shortly after midnight UTC (or per-user
 * midnight if timezone-aware scheduling is available — profiles.timezone
 * is stored for this purpose but per-user-timezone cron scheduling is
 * an infrastructure concern outside this route's scope).
 *
 * Trigger:
 *   POST /api/internal/cron/streaks
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    requireCronAuth(request);

    const supabase = createAdminClient();

    const { data: profiles, error } = await supabase.from('profiles').select('id');
    if (error) throw error;

    let processed = 0;
    for (const profile of profiles ?? []) {
      const { error: rpcError } = await supabase.rpc('recalculate_streak', { p_user_id: profile.id });
      if (!rpcError) processed++;
    }

    return jsonOk({ processed, total: (profiles ?? []).length }, { origin });
  });
}
