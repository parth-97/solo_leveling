import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { createMilestoneSchema } from '@/schemas/goal.schema';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** POST /api/v1/goals/:id/milestones — add a milestone to a goal (RLS ensures ownership via parent goal). */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id: goalId } = await params;
    const input = await parseBody(request, createMilestoneSchema);

    // Verify ownership (RLS would also block insert via the goals_select_own
    // join policy, but check explicitly for a clean 404 vs RLS error).
    const { data: goal, error: goalError } = await supabase.from('goals').select('id').eq('id', goalId).eq('user_id', userId).single();
    if (goalError || !goal) throw new ApiException('NOT_FOUND', 'Goal not found.');

    const { count } = await supabase.from('goal_milestones').select('*', { count: 'exact', head: true }).eq('goal_id', goalId);

    const { data: milestone, error } = await supabase
      .from('goal_milestones')
      .insert({
        goal_id: goalId,
        title: input.title,
        xp_reward: input.xpReward ?? 100,
        sort_order: count ?? 0,
      })
      .select('*')
      .single();

    if (error || !milestone) throw new ApiException('INTERNAL_ERROR', 'Failed to add milestone.');

    return jsonOk(toCamel(milestone), { origin, status: 201 });
  });
}
