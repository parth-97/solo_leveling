import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody, parseQuery } from '@/lib/utils/validation';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { createGoalSchema, listGoalsQuerySchema } from '@/schemas/goal.schema';
import { GOAL_SELECT, transformGoal } from '@/services/GoalService';

export const OPTIONS = handleOptions;

/** GET /api/v1/goals — list the current user's goals, filterable by period/status. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const query = parseQuery(url.searchParams, listGoalsQuerySchema);
    const { page, limit, offset } = parsePagination(request);

    let q = supabase.from('goals').select(GOAL_SELECT, { count: 'exact' }).eq('user_id', userId);
    if (query.period) q = q.eq('period', query.period);
    if (query.status) q = q.eq('status', query.status);

    const { data, error, count } = await q
      .order('is_pinned', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return jsonPaginated((data ?? []).map(transformGoal), paginationMeta(page, limit, count ?? 0), { origin });
  });
}

/** POST /api/v1/goals — create a goal, optionally with initial milestones. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const input = await parseBody(request, createGoalSchema);

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        category_id: input.categoryId ?? null,
        title: input.title,
        description: input.description ?? null,
        period: input.period,
        target_value: input.targetValue ?? null,
        unit: input.unit ?? null,
        xp_reward: input.xpReward ?? 500,
        deadline: input.deadline ?? null,
      })
      .select('id')
      .single();

    if (error || !goal) throw new ApiException('INTERNAL_ERROR', 'Failed to create goal.');

    if (input.milestones && input.milestones.length > 0) {
      const rows = input.milestones.map((m, i) => ({
        goal_id: goal.id,
        title: m.title,
        xp_reward: m.xpReward ?? 100,
        sort_order: i,
      }));
      const { error: milestoneError } = await supabase.from('goal_milestones').insert(rows);
      if (milestoneError) throw new ApiException('INTERNAL_ERROR', 'Goal created but failed to add milestones.');
    }

    const { data: fullGoal, error: fetchError } = await supabase
      .from('goals')
      .select(GOAL_SELECT)
      .eq('id', goal.id)
      .single();

    if (fetchError || !fullGoal) throw new ApiException('INTERNAL_ERROR', 'Goal created but failed to load.');

    return jsonOk(transformGoal(fullGoal), { origin, status: 201 });
  });
}
