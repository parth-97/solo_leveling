import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/utils/cronAuth';
import { withErrorHandling, jsonOk } from '@/lib/utils/response';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/internal/cron/daily-quests
 *
 * Generates today's daily quests for every user via
 * `generate_daily_quests` (files/03_analytics_engine.sql), skipping
 * users who already have quests for today (the function itself is
 * idempotent per the spec, but we also check here to avoid wasted RPCs
 * at scale).
 *
 * Schedule: once daily, shortly after midnight in each user's local
 * timezone — in practice, run hourly and let generate_daily_quests'
 * own date logic (server-side `today`) handle it, OR run once at a
 * fixed UTC time if per-timezone scheduling isn't available. This
 * matches GET /quests/daily's on-demand fallback, so quests are never
 * missing even if this cron is delayed.
 *
 * Trigger via your platform's scheduler (e.g. Vercel Cron) hitting:
 *   POST /api/internal/cron/daily-quests
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

    let generated = 0;
    let skipped = 0;

    for (const profile of profiles ?? []) {
      const { count } = await supabase
        .from('daily_quests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('quest_date', today);

      if (count && count > 0) {
        skipped++;
        continue;
      }

      await supabase.rpc('generate_daily_quests', { p_user_id: profile.id, p_date: today, p_count: 5 });
      generated++;
    }

    return jsonOk({ date: today, generated, skipped, total: (profiles ?? []).length }, { origin });
  });
}
