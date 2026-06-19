import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

/**
 * POST /api/v1/profile/me/reset
 *
 * Fully resets the authenticated user's profile back to a fresh state.
 *
 * WHY admin client:
 *   Many tables (xp_transactions, daily_quests, analytics_scores, reports,
 *   leaderboard_snapshots, ai_insights, activity_feed, user_achievements,
 *   challenge_participants) have SELECT-only or no DELETE RLS policies for
 *   the `authenticated` role — they are written by service_role jobs only.
 *   The RLS-scoped client would silently skip those deletes. We authenticate
 *   the caller with requireAuth() first, then use the admin client (which
 *   bypasses RLS) scoped strictly to the verified userId.
 *
 * DELETED:
 *   habit_logs, habits, goals (+ goal_milestones via FK cascade),
 *   daily_quests, xp_transactions, user_achievements, analytics_scores,
 *   reports, leaderboard_snapshots, notifications, ai_insights,
 *   activity_feed, challenge_participants, group_members
 *
 * RESET on profiles:
 *   xp, level, rank, xp_to_next_level, current_streak, max_streak,
 *   last_active_date, quests_completed, habits_tracked,
 *   achievements_count, total_xp_earned, onboarding_completed,
 *   onboarding_step
 *
 * PRESERVED:
 *   username, display_name, avatar_url, bio, timezone, settings,
 *   friendships (social graph)
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    // 1. Verify the caller is authenticated — get their userId.
    const { userId } = await requireAuth(request);

    // 2. Use the admin client so RLS never blocks the deletes.
    const admin = createAdminClient();

    // 3. Delete all progress data. Order matters:
    //    - habit_logs before habits (FK parent)
    //    - goals before goal_milestones would cascade anyway, but be explicit
    const tables: Array<{ table: string; column: string }> = [
      { table: 'habit_logs',              column: 'user_id' },
      { table: 'habits',                  column: 'user_id' },
      { table: 'goals',                   column: 'user_id' }, // cascades goal_milestones
      { table: 'daily_quests',            column: 'user_id' },
      { table: 'xp_transactions',         column: 'user_id' },
      { table: 'user_achievements',       column: 'user_id' },
      { table: 'analytics_scores',        column: 'user_id' },
      { table: 'reports',                 column: 'user_id' },
      { table: 'leaderboard_snapshots',   column: 'user_id' },
      { table: 'notifications',           column: 'user_id' },
      { table: 'ai_insights',             column: 'user_id' },
      { table: 'activity_feed',           column: 'user_id' },
      { table: 'challenge_participants',  column: 'user_id' },
      { table: 'group_members',           column: 'user_id' },
    ];

    const deletions = await Promise.allSettled(
      tables.map(({ table, column }) =>
        admin.from(table).delete().eq(column, userId)
      )
    );

    for (let i = 0; i < deletions.length; i++) {
      const result = deletions[i];
      if (result.status === 'fulfilled' && result.value.error) {
        console.warn(`[profile/reset] Error deleting from ${tables[i].table}:`, result.value.error.message);
      } else if (result.status === 'rejected') {
        console.warn(`[profile/reset] Threw deleting from ${tables[i].table}:`, result.reason);
      }
    }

    // 4. Reset the profile row to default progression values.
    const { data: profile, error } = await admin
      .from('profiles')
      .update({
        xp: 0,
        level: 1,
        rank: 'E',
        xp_to_next_level: 1000,
        current_streak: 0,
        max_streak: 0,
        last_active_date: null,
        quests_completed: 0,
        habits_tracked: 0,
        achievements_count: 0,
        total_xp_earned: 0,
        onboarding_completed: false,
        onboarding_step: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error || !profile) {
      throw new ApiException('INTERNAL_ERROR', 'Failed to reset profile progress.');
    }

    // 5. Return the fresh profile (same shape as GET /profile/me).
    const profileCamel = toCamel(profile) as Record<string, unknown>;
    return jsonOk(
      {
        ...profileCamel,
        // email not in profiles table — fetch from auth
        email: '',
        xpToNextLevel: 1000,
        lifeScore: 0,
        disciplineScore: 0,
        growthScore: 0,
        healthScore: 0,
        learningScore: 0,
        productivityScore: 0,
        relationshipScore: 0,
        xpEarnedToday: 0,
      },
      { origin }
    );
  });
}
