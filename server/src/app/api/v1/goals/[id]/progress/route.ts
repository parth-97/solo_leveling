import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { updateGoalProgressSchema } from '@/schemas/goal.schema';
import { GOAL_SELECT, transformGoal } from '@/services/GoalService';
import { awardXp } from '@/services/XpService';
import { postActivity } from '@/services/CommunityService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/v1/goals/:id/progress — update progress (0–100).
 * If progress reaches 100 and the goal isn't already completed, it's
 * auto-marked completed and awards xp_reward (same effect as
 * POST /goals/:id/complete, but triggered implicitly by progress).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;
    const input = await parseBody(request, updateGoalProgressSchema);

    const { data: existing, error: fetchError } = await supabase
      .from('goals')
      .select('id, status, xp_reward, title, progress')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) throw new ApiException('NOT_FOUND', 'Goal not found.');

    const updates: Record<string, unknown> = { progress: input.progress };
    if (input.currentValue !== undefined) updates.current_value = input.currentValue;

    const willComplete = input.progress >= 100 && existing.status !== 'completed';
    if (willComplete) {
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase.from('goals').update(updates).eq('id', id);
    if (updateError) throw new ApiException('INTERNAL_ERROR', 'Failed to update goal progress.');

    let xpAwarded = 0;
    let leveledUp = false;

    if (willComplete) {
      xpAwarded = existing.xp_reward;
      const xpResult = await awardXp(supabase, userId, xpAwarded, 'goal', id, `Goal completed: ${existing.title}`);
      leveledUp = xpResult.leveledUp;
      await postActivity(supabase, userId, 'completed', existing.title, 'goal', id, xpAwarded);
    }

    const { data: goal, error } = await supabase.from('goals').select(GOAL_SELECT).eq('id', id).single();
    if (error || !goal) throw new ApiException('INTERNAL_ERROR', 'Goal updated but failed to load.');

    return jsonOk({ goal: transformGoal(goal), xpAwarded, leveledUp }, { origin });
  });
}
