import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';
import { awardXp } from '@/services/XpService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string; mid: string }> };

/**
 * PATCH /api/v1/goals/:id/milestones/:mid — mark a milestone complete.
 *
 * Side effects:
 *  - Recomputes the parent goal's `progress` as
 *    (completed milestones / total milestones) * 100.
 *  - Awards the milestone's xp_reward.
 *  - If this brings progress to 100, also marks the goal completed
 *    (without separately awarding the goal's own xp_reward here —
 *    call POST /goals/:id/complete for that, matching the spec where
 *    milestone completion and goal completion are awarded independently).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id: goalId, mid } = await params;

    // Verify ownership via parent goal
    const { data: goal, error: goalError } = await supabase.from('goals').select('id, title').eq('id', goalId).eq('user_id', userId).single();
    if (goalError || !goal) throw new ApiException('NOT_FOUND', 'Goal not found.');

    const { data: milestone, error: milestoneError } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('id', mid)
      .eq('goal_id', goalId)
      .single();

    if (milestoneError || !milestone) throw new ApiException('NOT_FOUND', 'Milestone not found.');
    if (milestone.completed) throw new ApiException('CONFLICT', 'Milestone already completed.');

    const { error: updateError } = await supabase
      .from('goal_milestones')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', mid);

    if (updateError) throw new ApiException('INTERNAL_ERROR', 'Failed to complete milestone.');

    // Recompute parent goal progress from milestone completion ratio
    const { data: allMilestones } = await supabase.from('goal_milestones').select('completed').eq('goal_id', goalId);
    const total = allMilestones?.length ?? 0;
    const done = (allMilestones ?? []).filter((m: { completed: boolean }) => m.completed).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    const goalUpdates: Record<string, unknown> = { progress };
    if (progress >= 100) {
      goalUpdates.status = 'completed';
      goalUpdates.completed_at = new Date().toISOString();
    }
    await supabase.from('goals').update(goalUpdates).eq('id', goalId);

    const xpAwarded = milestone.xp_reward ?? 0;
    if (xpAwarded > 0) {
      await awardXp(supabase, userId, xpAwarded, 'goal', goalId, `Milestone completed: ${milestone.title} (${goal.title})`);
    }

    const { data: updatedMilestone } = await supabase.from('goal_milestones').select('*').eq('id', mid).single();

    return jsonOk({ milestone: toCamel(updatedMilestone), xpAwarded }, { origin });
  });
}
