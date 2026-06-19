import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { GOAL_SELECT, transformGoal } from '@/services/GoalService';
import { awardXp } from '@/services/XpService';
import { postActivity } from '@/services/CommunityService';
import { checkAndUnlockAchievements } from '@/services/AchievementService';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/goals/:id/complete — mark a goal as completed and award its xp_reward.
 *
 * FIXES APPLIED:
 *  - Idempotent: completing an already-completed goal returns unchanged with xpAwarded=0.
 *  - Cannot complete a goal marked as "failed" (deadline passed → auto-penalized).
 *  - Cannot complete a goal after its deadline has passed (anti-exploit).
 *  - Sets completed_at timestamp for audit trail.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: existing, error: fetchError } = await supabase
      .from('goals')
      .select('id, status, xp_reward, title, deadline, penalty_applied_at')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) throw new ApiException('NOT_FOUND', 'Goal not found.');

    // Cannot complete a failed goal (deadline already missed, penalty applied)
    if (existing.status === 'failed') {
      throw new ApiException(
        'FORBIDDEN',
        'This goal has already failed (deadline missed). It cannot be completed.'
      );
    }

    // Anti-exploit: cannot complete a goal whose deadline has passed
    // (the midnight rollover will/has already penalized it as failed)
    const serverToday = new Date().toISOString().slice(0, 10);
    if (existing.deadline && existing.deadline < serverToday && existing.status !== 'completed') {
      throw new ApiException(
        'FORBIDDEN',
        `Goal deadline has passed (${existing.deadline}). It will be marked as failed during the next midnight rollover.`
      );
    }

    let xpAwarded = 0;
    let leveledUp = false;
    let achievementIds: string[] = [];

    if (existing.status !== 'completed') {
      const { error: updateError } = await supabase
        .from('goals')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId); // extra ownership guard

      if (updateError) throw new ApiException('INTERNAL_ERROR', 'Failed to complete goal.');

      xpAwarded = existing.xp_reward;
      const xpResult = await awardXp(
        supabase,
        userId,
        xpAwarded,
        'goal',
        id,
        `Goal completed: ${existing.title}`
      );
      leveledUp = xpResult.leveledUp;

      await postActivity(supabase, userId, 'completed', existing.title, 'goal', id, xpAwarded);
      achievementIds = await checkAndUnlockAchievements(supabase, userId);
    }

    const { data: goal, error } = await supabase.from('goals').select(GOAL_SELECT).eq('id', id).single();
    if (error || !goal) throw new ApiException('INTERNAL_ERROR', 'Goal completed but failed to load.');

    let achievements: unknown[] = [];
    if (achievementIds.length > 0) {
      const { data: achData } = await supabase.from('achievements').select('*').in('id', achievementIds);
      achievements = toCamel(achData ?? []);
    }

    return jsonOk(
      { goal: transformGoal(goal), xpAwarded, leveledUp, achievementsUnlocked: achievements },
      { origin }
    );
  });
}
