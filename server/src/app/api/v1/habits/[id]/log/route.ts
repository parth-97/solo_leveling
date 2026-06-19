import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { logHabitSchema } from '@/schemas/habit.schema';
import { toCamel } from '@/lib/utils/case';
import { recalculateHabitStreak, checkDateLocked } from '@/services/HabitService';
import { awardXp, recalculateStreak } from '@/services/XpService';
import { postActivity } from '@/services/CommunityService';
import { checkAndUnlockAchievements } from '@/services/AchievementService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/habits/:id/log — log a habit completion for a date
 * (defaults to today). Side effects:
 *  - Inserts habit_logs row with ON CONFLICT guard (unique per habit/date).
 *  - Awards xp_per_completion via award_xp.
 *  - Recalculates habit streak and user-level streak.
 *  - Posts to activity feed and checks achievements.
 *
 * FIXES APPLIED:
 *  - Day lock check: past days processed by midnight rollover are rejected.
 *  - Creation date check: cannot log before habit was created.
 *  - Future date check: cannot log future dates.
 *  - Duplicate prevention via DB unique constraint + pre-check.
 *  - Server-side date enforcement (ignores client clock).
 */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id: habitId } = await params;
    const input = await parseBody(request, logHabitSchema);

    // Use SERVER time — never trust client-provided date for security-sensitive ops.
    // We allow clients to specify which past date (for retroactive logging within
    // the same day lock window), but always validate server-side.
    const serverToday = new Date().toISOString().slice(0, 10);
    const loggedDate = input.loggedDate ?? serverToday;

    // 1. Verify habit ownership
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, name, xp_per_completion, created_at')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitError || !habit) throw new ApiException('NOT_FOUND', 'Habit not found.');

    // 2. Future dates are absolutely forbidden (no client clock spoofing)
    if (loggedDate > serverToday) {
      throw new ApiException('VALIDATION_ERROR', 'Cannot log a habit for a future date.');
    }

    // 3. Check if the date is locked (via checkDateLocked which checks creation
    //    date, rollover log, and is_locked flag on existing logs)
    const lockError = await checkDateLocked(supabase, habitId, userId, loggedDate);
    if (lockError) {
      throw new ApiException('FORBIDDEN', lockError);
    }

    // 4. Check for duplicate log (unique constraint will also catch this,
    //    but we give a user-friendly error before hitting the DB constraint)
    const { data: existingLog } = await supabase
      .from('habit_logs')
      .select('id, completed')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('logged_date', loggedDate)
      .maybeSingle();

    if (existingLog) {
      if (existingLog.completed) {
        throw new ApiException('CONFLICT', `Habit already completed for ${loggedDate}.`);
      } else {
        throw new ApiException('CONFLICT', `Habit was marked as missed for ${loggedDate}. Cannot complete a missed day.`);
      }
    }

    const xpAwarded = habit.xp_per_completion as number;

    // 5. Insert log — ON CONFLICT DO NOTHING as a final safety net against races
    const { data: log, error: insertError } = await supabase
      .from('habit_logs')
      .insert({
        habit_id: habitId,
        user_id: userId,
        logged_date: loggedDate,
        completed: true,
        note: input.note ?? null,
        xp_earned: xpAwarded,
      })
      .select('*')
      .single();

    if (insertError) {
      // Unique constraint violation = race condition duplicate
      if (insertError.code === '23505') {
        throw new ApiException('CONFLICT', `Habit already logged for ${loggedDate}.`);
      }
      throw new ApiException('INTERNAL_ERROR', 'Failed to log habit.');
    }
    if (!log) throw new ApiException('INTERNAL_ERROR', 'Failed to log habit.');

    // 6. Recalculate streaks and award XP
    const { currentStreak: newHabitStreak } = await recalculateHabitStreak(supabase, habitId);
    const xpResult = await awardXp(supabase, userId, xpAwarded, 'habit', habitId, `Habit completed: ${habit.name}`);
    await recalculateStreak(supabase, userId);

    // 7. Side effects
    await postActivity(supabase, userId, 'completed', habit.name as string, 'habit', habitId, xpAwarded);
    await checkAndUnlockAchievements(supabase, userId);

    return jsonOk(
      {
        log: toCamel(log),
        xpAwarded,
        newStreak: newHabitStreak,
        leveledUp: xpResult.leveledUp,
      },
      { origin }
    );
  });
}
