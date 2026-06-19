import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { updateHabitSchema } from '@/schemas/habit.schema';
import { HABIT_SELECT, transformHabit } from '@/services/HabitService';
import { awardXp, recalculateStreak } from '@/services/XpService';
import { getOrComputeTodayScores } from '@/services/AnalyticsService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/habits/:id */
export async function GET(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { supabase } = await requireAuth(request);
    const { id } = await params;

    const { data, error } = await supabase.from('habits').select(HABIT_SELECT).eq('id', id).single();
    if (error || !data) throw new ApiException('NOT_FOUND', 'Habit not found.');

    return jsonOk(await transformHabit(supabase, data), { origin });
  });
}

/** PATCH /api/v1/habits/:id — update habit fields. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;
    const input = await parseBody(request, updateHabitSchema);

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.categoryId !== undefined) updates.category_id = input.categoryId;
    if (input.iconName !== undefined) updates.icon_name = input.iconName;
    if (input.color !== undefined) updates.color = input.color;
    if (input.weeklyTarget !== undefined) updates.weekly_target = input.weeklyTarget;
    if (input.xpPerCompletion !== undefined) updates.xp_per_completion = input.xpPerCompletion;
    if (input.isActive !== undefined) updates.is_active = input.isActive;

    if (Object.keys(updates).length === 0) {
      throw new ApiException('VALIDATION_ERROR', 'No fields provided to update.');
    }

    const { error: updateError, data: updatedRows } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');
    const count = updatedRows?.length ?? 0;

    if (updateError) throw new ApiException('INTERNAL_ERROR', 'Failed to update habit.');
    if (!count) throw new ApiException('NOT_FOUND', 'Habit not found.');

    const { data, error } = await supabase.from('habits').select(HABIT_SELECT).eq('id', id).single();
    if (error || !data) throw new ApiException('INTERNAL_ERROR', 'Habit updated but failed to load.');

    return jsonOk(await transformHabit(supabase, data), { origin });
  });
}

/**
 * DELETE /api/v1/habits/:id — permanently deletes the habit.
 * Side effects:
 *  - sums xp_earned across every habit_logs row for this habit
 *  - deletes the habit (habit_logs cascade-delete with it)
 *  - deducts that total via award_xp (negative amount), which
 *    recalculates profiles.xp / level / rank in the same place
 *    every other XP-earning action does
 *  - recalculates the user's overall streak, since the logs that
 *    contributed to it are now gone
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (habitError || !habit) throw new ApiException('NOT_FOUND', 'Habit not found.');

    const { data: logs, error: logsError } = await supabase
      .from('habit_logs')
      .select('xp_earned')
      .eq('habit_id', id);

    if (logsError) throw new ApiException('INTERNAL_ERROR', 'Failed to read habit history.');

    const xpToDeduct = (logs ?? []).reduce((sum, l) => sum + (l.xp_earned ?? 0), 0);

    const { error: deleteError } = await supabase
      .from('habits')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) throw new ApiException('INTERNAL_ERROR', 'Failed to delete habit.');

    let newXp = 0;
    let newLevel = 1;
    let newRank: Awaited<ReturnType<typeof awardXp>>['newRank'] = 'E';
    let leveledDown = false;

    if (xpToDeduct > 0) {
      const { data: before } = await supabase.from('profiles').select('level').eq('id', userId).single();
      const levelBefore = before?.level ?? 1;

      const result = await awardXp(supabase, userId, -xpToDeduct, 'habit', id, `Habit deleted: ${habit.name}`);
      newXp = result.newXp;
      newLevel = result.newLevel;
      newRank = result.newRank;
      leveledDown = result.newLevel < levelBefore;
    } else {
      const { data: profile } = await supabase.from('profiles').select('xp, level, rank').eq('id', userId).single();
      if (profile) {
        newXp = profile.xp;
        newLevel = profile.level;
        newRank = profile.rank;
      }
    }

    await recalculateStreak(supabase, userId);

    // Refresh today's analytics snapshot so xp_earned_today reflects the
    // deduction immediately — without this the Analytics and Dashboard pages
    // show stale XP until the next cron tick.
    try {
      await getOrComputeTodayScores(supabase, userId);
    } catch {
      // Non-fatal: analytics will self-correct on next poll; don't surface
      // a 500 to the client after the habit was already deleted.
    }

    return jsonOk(
      { id, deleted: true as const, xpDeducted: xpToDeduct, newXp, newLevel, newRank, leveledDown },
      { origin }
    );
  });
}
