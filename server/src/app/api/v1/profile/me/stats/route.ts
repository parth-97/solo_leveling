import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';

export const OPTIONS = handleOptions;

/**
 * GET /api/v1/profile/me/stats — aggregated lifetime stats.
 *
 * Most fields are denormalised counters on `profiles`. `totalGoalsCompleted`
 * is computed via a count query against `goals` since there's no
 * dedicated counter column for it in the schema.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('total_xp_earned, quests_completed, habits_tracked, achievements_count, max_streak, current_streak')
      .eq('id', userId)
      .single();

    if (error || !profile) throw new ApiException('NOT_FOUND', 'Profile not found.');

    const { count: totalGoalsCompleted } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    return jsonOk(
      {
        totalXpEarned: profile.total_xp_earned,
        questsCompleted: profile.quests_completed,
        habitsTracked: profile.habits_tracked,
        achievementsCount: profile.achievements_count,
        maxStreak: profile.max_streak,
        currentStreak: profile.current_streak,
        totalGoalsCompleted: totalGoalsCompleted ?? 0,
      },
      { origin }
    );
  });
}
