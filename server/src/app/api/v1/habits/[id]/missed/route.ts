import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { markMissedSchema } from '@/schemas/habit.schema';
import { toCamel } from '@/lib/utils/case';
import { recalculateHabitStreak, checkDateLocked } from '@/services/HabitService';
import { awardXp, recalculateStreak } from '@/services/XpService';
import { postActivity } from '@/services/CommunityService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/habits/:id/missed — manually mark a past day as missed.
 *
 * This is for the CURRENT WEEK only (Mon → yesterday). The midnight
 * rollover automatically marks missed days for previous days.
 *
 * XP Penalty Rule (per spec):
 *   Missed penalty = -xp_per_completion (full penalty, same as reward)
 *
 * FIXES APPLIED:
 *  - Full XP penalty (was 50% before — fixed to 100% per spec).
 *  - Day lock check: locked days cannot be manually marked missed.
 *  - Creation date check: cannot mark dates before habit was created.
 *  - Duplicate prevention with conflict guard.
 *  - The existing log must be absent before inserting.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id: habitId } = await params;
    const input = await parseBody(request, markMissedSchema);

    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, name, xp_per_completion, created_at')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitError || !habit) throw new ApiException('NOT_FOUND', 'Habit not found.');

    const missedDate = input.missedDate;
    const serverToday = new Date().toISOString().slice(0, 10);

    // Can only mark PAST days as missed (not today — today is still active)
    if (missedDate >= serverToday) {
      throw new ApiException('BAD_REQUEST', 'Can only mark past days as missed. Today is still active.');
    }

    // Day lock check (creation date + rollover lock + is_locked flag)
    const lockError = await checkDateLocked(supabase, habitId, userId, missedDate);
    if (lockError) {
      throw new ApiException('FORBIDDEN', `Day Locked — ${lockError}`);
    }

    // Must be within the current week (Mon → yesterday) for manual marking.
    // Older days are auto-processed by the midnight rollover cron.
    const currentDay = new Date().getUTCDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const weekStart = new Date();
    weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    if (missedDate < weekStartStr) {
      throw new ApiException(
        'BAD_REQUEST',
        'Can only manually mark missed days within the current week. Older days are processed automatically at midnight.'
      );
    }

    // Check no log already exists for that date
    const { data: existingLog } = await supabase
      .from('habit_logs')
      .select('id, completed')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('logged_date', missedDate)
      .maybeSingle();

    if (existingLog) {
      const status = existingLog.completed ? 'completed' : 'already marked as missed';
      throw new ApiException('CONFLICT', `Habit already ${status} for ${missedDate}.`);
    }

    // XP penalty = 100% of xp_per_completion (full penalty per spec)
    const xpPenalty = Math.max(1, Math.floor(habit.xp_per_completion as number));

    // Insert missed log
    const { data: log, error: insertError } = await supabase
      .from('habit_logs')
      .insert({
        habit_id: habitId,
        user_id: userId,
        logged_date: missedDate,
        completed: false,
        note: input.note ?? null,
        xp_earned: -xpPenalty,
        penalty_applied: true,
      })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        throw new ApiException('CONFLICT', `Habit already logged for ${missedDate}.`);
      }
      throw new ApiException('INTERNAL_ERROR', 'Failed to record missed habit.');
    }
    if (!log) throw new ApiException('INTERNAL_ERROR', 'Failed to record missed habit.');

    const { currentStreak: newHabitStreak } = await recalculateHabitStreak(supabase, habitId);

    const xpResult = await awardXp(
      supabase,
      userId,
      -xpPenalty,
      'habit',
      habitId,
      `Habit missed: ${habit.name}`
    );

    await recalculateStreak(supabase, userId);

    await postActivity(
      supabase,
      userId,
      'completed' as never, // activity type for missed — backend logs it
      habit.name as string,
      'habit',
      habitId,
      -xpPenalty
    );

    return jsonOk(
      {
        log: toCamel(log),
        xpDeducted: xpPenalty,
        newStreak: newHabitStreak,
        newXp: xpResult.newXp,
        newLevel: xpResult.newLevel,
        leveledDown: false, // XP system handles level-down internally
      },
      { origin }
    );
  });
}
