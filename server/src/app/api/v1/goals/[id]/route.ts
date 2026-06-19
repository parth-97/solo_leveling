import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { updateGoalSchema } from '@/schemas/goal.schema';
import { GOAL_SELECT, transformGoal } from '@/services/GoalService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/goals/:id */
export async function GET(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { supabase } = await requireAuth(request);
    const { id } = await params;

    const { data, error } = await supabase.from('goals').select(GOAL_SELECT).eq('id', id).single();
    if (error || !data) throw new ApiException('NOT_FOUND', 'Goal not found.');

    return jsonOk(transformGoal(data), { origin });
  });
}

/** PATCH /api/v1/goals/:id — update goal fields. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;
    const input = await parseBody(request, updateGoalSchema);

    const updates: Record<string, unknown> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.categoryId !== undefined) updates.category_id = input.categoryId;
    if (input.status !== undefined) updates.status = input.status;
    if (input.progress !== undefined) updates.progress = input.progress;
    if (input.currentValue !== undefined) updates.current_value = input.currentValue;
    if (input.deadline !== undefined) updates.deadline = input.deadline;
    if (input.isPinned !== undefined) updates.is_pinned = input.isPinned;

    if (Object.keys(updates).length === 0) {
      throw new ApiException('VALIDATION_ERROR', 'No fields provided to update.');
    }

    // If marking completed via a generic PATCH, stamp completed_at.
    if (updates.status === 'completed') updates.completed_at = new Date().toISOString();

    // FIX: .select('id', { count: 'exact' }) silently drops the count option
    // on update() chains in Supabase JS v2 — count always comes back null,
    // causing a false NOT_FOUND on every edit. Use the returned data array instead.
    const { data: updatedRows, error: updateError } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (updateError) throw new ApiException('INTERNAL_ERROR', 'Failed to update goal.');
    if (!updatedRows || updatedRows.length === 0) throw new ApiException('NOT_FOUND', 'Goal not found.');

    const { data, error } = await supabase.from('goals').select(GOAL_SELECT).eq('id', id).single();
    if (error || !data) throw new ApiException('INTERNAL_ERROR', 'Goal updated but failed to load.');

    return jsonOk(transformGoal(data), { origin });
  });
}

/** DELETE /api/v1/goals/:id */
export async function DELETE(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    // FIX: same issue as PATCH — count is always null after delete().select(..., { count: 'exact' }).
    // Check the returned data array length instead.
    const { data: deletedRows, error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw new ApiException('INTERNAL_ERROR', 'Failed to delete goal.');
    if (!deletedRows || deletedRows.length === 0) throw new ApiException('NOT_FOUND', 'Goal not found.');

    return jsonOk({ id }, { origin });
  });
}
