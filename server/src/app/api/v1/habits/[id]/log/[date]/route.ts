import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { dateParamSchema } from '@/schemas/habit.schema';
import { recalculateHabitStreak, checkDateLocked } from '@/services/HabitService';
import { awardXp, recalculateStreak } from '@/services/XpService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string; date: string }> };

/**
 * DELETE /api/v1/habits/:id/log/:date — undo a habit completion log.
 *
 * FIXES APPLIED:
 *  - Day lock check: past days processed by midnight rollover CANNOT be undone.
 *  - Locked logs (is_locked=true) are rejected.
 *  - XP is reversed when undo succeeds.
 *  - Only today's logs can be undone; past days lock at midnight.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id: habitId, date } = await params;

    const parsedDate = dateParamSchema.safeParse(date);
    if (!parsedDate.success) {
      throw new ApiException('VALIDATION_ERROR', 'Date must be in YYYY-MM-DD format.');
    }

    // Verify habit ownership
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, name, xp_per_completion')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();
    if (habitError || !habit) throw new ApiException('NOT_FOUND', 'Habit not found.');

    // Day lock check — past days that went through midnight rollover are immutable
    const lockError = await checkDateLocked(supabase, habitId, userId, date);
    if (lockError) {
      throw new ApiException('FORBIDDEN', `Day Locked — ${lockError}`);
    }

    // Find the log to delete
    const { data: existingLog } = await supabase
      .from('habit_logs')
      .select('id, completed, xp_earned, is_locked')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('logged_date', date)
      .maybeSingle();

    if (!existingLog) throw new ApiException('NOT_FOUND', 'No log found for that date.');

    // Cannot undo a locked log
    if (existingLog.is_locked) {
      throw new ApiException('FORBIDDEN', `Day Locked — this log cannot be undone.`);
    }

    // Can only undo a COMPLETED log (not a missed log)
    if (!existingLog.completed) {
      throw new ApiException('BAD_REQUEST', 'Cannot undo a missed day marker.');
    }

    const { error } = await supabase
      .from('habit_logs')
      .delete()
      .eq('id', existingLog.id)
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('logged_date', date);

    if (error) throw new ApiException('INTERNAL_ERROR', 'Failed to undo habit log.');

    // Reverse the XP that was awarded for this log
    const xpToReverse = existingLog.xp_earned as number;
    if (xpToReverse > 0) {
      await awardXp(supabase, userId, -xpToReverse, 'habit', habitId, `Habit log undone: ${habit.name}`);
    }

    await recalculateHabitStreak(supabase, habitId);
    await recalculateStreak(supabase, userId);

    return jsonOk({ deleted: true, xpReversed: xpToReverse }, { origin });
  });
}
