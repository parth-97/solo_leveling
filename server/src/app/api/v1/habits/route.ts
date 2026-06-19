import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { createHabitSchema } from '@/schemas/habit.schema';
import { HABIT_SELECT, transformHabit } from '@/services/HabitService';

export const OPTIONS = handleOptions;

/** GET /api/v1/habits — list the current user's active habits with computed fields. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    const { data, error } = await supabase
      .from('habits')
      .select(HABIT_SELECT)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    const habits = await Promise.all((data ?? []).map((row) => transformHabit(supabase, row)));
    return jsonOk(habits, { origin });
  });
}

/** POST /api/v1/habits — create a new habit. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const input = await parseBody(request, createHabitSchema);

    const { count } = await supabase.from('habits').select('*', { count: 'exact', head: true }).eq('user_id', userId);

    const { data: habit, error } = await supabase
      .from('habits')
      .insert({
        user_id: userId,
        category_id: input.categoryId ?? null,
        name: input.name,
        description: input.description ?? null,
        icon_name: input.iconName ?? 'Circle',
        color: input.color ?? '#3b82f6',
        weekly_target: input.weeklyTarget ?? 5,
        xp_per_completion: input.xpPerCompletion ?? 50,
        sort_order: count ?? 0,
      })
      .select(HABIT_SELECT)
      .single();

    if (error || !habit) throw new ApiException('INTERNAL_ERROR', 'Failed to create habit.');

    // FIX: atomically increment habits_tracked counter (was never incremented before)
    await supabase.rpc('increment_profile_counter', {
      p_user_id: userId,
      p_column: 'habits_tracked',
    });

    return jsonOk(await transformHabit(supabase, habit), { origin, status: 201 });
  });
}
