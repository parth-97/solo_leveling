import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

const QUEST_SELECT = `*, category:categories(id, name, slug, icon_name, color, description)`;

/**
 * GET /api/v1/quests/daily — today's daily quests for the current user.
 *
 * If none exist for today yet (first request of the day), calls
 * `generate_daily_quests` (files/03_analytics_engine.sql) to create a
 * fresh set, then returns them. This makes quest generation
 * "on-demand" rather than purely cron-driven — the cron job at
 * /api/internal/cron/daily-quests covers users who don't open the app,
 * for streak-preservation purposes (see that route's docstring).
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const today = new Date().toISOString().slice(0, 10);

    let { data: quests, error } = await supabase
      .from('daily_quests')
      .select(QUEST_SELECT)
      .eq('user_id', userId)
      .eq('quest_date', today)
      .order('is_bonus', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!quests || quests.length === 0) {
      const { error: genError } = await supabase.rpc('generate_daily_quests', {
        p_user_id: userId,
        p_date: today,
        p_count: 5,
      });
      if (genError) throw genError;

      const refetch = await supabase
        .from('daily_quests')
        .select(QUEST_SELECT)
        .eq('user_id', userId)
        .eq('quest_date', today)
        .order('is_bonus', { ascending: true })
        .order('created_at', { ascending: true });

      if (refetch.error) throw refetch.error;
      quests = refetch.data;
    }

    return jsonOk(toCamel(quests ?? []), { origin });
  });
}
