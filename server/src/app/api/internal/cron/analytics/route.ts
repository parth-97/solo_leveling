import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/utils/cronAuth';
import { withErrorHandling, jsonOk } from '@/lib/utils/response';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/internal/cron/analytics
 *
 * Computes and stores today's analytics_scores snapshot for every user
 * via `upsert_analytics_snapshot` (files/03_analytics_engine.sql).
 *
 * This pre-warms GET /analytics/scores/today so it's instant rather
 * than computing on first request. GET /analytics/scores/today still
 * calls upsert_analytics_snapshot itself as a fallback for users whose
 * snapshot is missing or stale (e.g. activity after this cron ran).
 *
 * Schedule: run late in the day (e.g. 23:00 UTC) so the snapshot
 * reflects a full day's activity, and again after midnight to seed the
 * new day's row at zero.
 *
 * Trigger:
 *   POST /api/internal/cron/analytics
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    requireCronAuth(request);

    const supabase = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: profiles, error } = await supabase.from('profiles').select('id');
    if (error) throw error;

    let succeeded = 0;
    let failed = 0;

    for (const profile of profiles ?? []) {
      const { error: rpcError } = await supabase.rpc('upsert_analytics_snapshot', { p_user_id: profile.id, p_date: today });
      if (rpcError) failed++;
      else succeeded++;
    }

    return jsonOk({ date: today, succeeded, failed, total: (profiles ?? []).length }, { origin });
  });
}
