import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/habits/:id/stats — HabitStats: 14d/30d completion rates,
 * current/max streak, total completions, and a streak-over-time series.
 *
 * FIXES APPLIED:
 *  - completionRate14d denominator = min(14, daysSinceCreation)
 *  - completionRate30d denominator = min(30, daysSinceCreation)
 *  - streakHistory never includes dates before habit creation
 *  - Missed logs (completed=false) break running streak in streakHistory
 */
export async function GET(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id: habitId } = await params;

    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, current_streak, max_streak, total_completions, created_at')
      .eq('id', habitId)
      .eq('user_id', userId)
      .single();

    if (habitError || !habit) throw new ApiException('NOT_FOUND', 'Habit not found.');

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    // Clamp all windows to the habit's creation date
    const habitCreatedDate = (habit.created_at as string).slice(0, 10);

    // 30-day window, but never before creation
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setUTCDate(today.getUTCDate() - 29);
    const rawWindowStart30 = thirtyDaysAgo.toISOString().slice(0, 10);
    const effectiveStart30 = rawWindowStart30 > habitCreatedDate ? rawWindowStart30 : habitCreatedDate;

    // 14-day window, but never before creation
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setUTCDate(today.getUTCDate() - 13);
    const rawWindowStart14 = fourteenDaysAgo.toISOString().slice(0, 10);
    const effectiveStart14 = rawWindowStart14 > habitCreatedDate ? rawWindowStart14 : habitCreatedDate;

    // Fetch logs from effectiveStart30 (narrowest window that covers both 14d and 30d)
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('logged_date, completed')
      .eq('habit_id', habitId)
      .gte('logged_date', effectiveStart30)
      .lte('logged_date', todayIso)
      .order('logged_date', { ascending: true });

    const logRows = (logs ?? []) as Array<{ logged_date: string; completed: boolean }>;

    // Build a map: date → true/false
    const logMap = new Map<string, boolean>();
    for (const l of logRows) {
      logMap.set(l.logged_date, l.completed);
    }

    // Count completions in each window
    let count14 = 0;
    let count30 = 0;
    for (const [date, completed] of logMap) {
      if (!completed) continue;
      if (date >= effectiveStart30) count30++;
      if (date >= effectiveStart14) count14++;
    }

    // Denominators: actual days in window (not a fixed 14/30)
    const days30 = daysBetween(effectiveStart30, todayIso) + 1;
    const days14 = daysBetween(effectiveStart14, todayIso) + 1;
    const denominator30 = Math.min(30, days30);
    const denominator14 = Math.min(14, days14);

    // Build day-by-day streak history starting from effectiveStart30
    // FIX: missed logs (completed=false) now break the running streak
    const streakHistory: Array<{ date: string; streak: number }> = [];
    let runningStreak = 0;
    const cursor = new Date(effectiveStart30 + 'T00:00:00Z');
    const end = new Date(todayIso + 'T00:00:00Z');

    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10);
      const status = logMap.get(iso);

      if (status === true) {
        runningStreak += 1;
      } else if (status === false) {
        // Explicit miss — break streak
        runningStreak = 0;
      } else {
        // No log for this date — gap (before today could be auto-missed by rollover
        // but if rollover hasn't run yet, treat as missed)
        runningStreak = 0;
      }

      streakHistory.push({ date: iso, streak: runningStreak });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return jsonOk(
      {
        habitId,
        habitCreatedDate,
        completionRate14d:
          denominator14 > 0 ? Math.round((count14 / denominator14) * 100) / 100 : 0,
        completionRate30d:
          denominator30 > 0 ? Math.round((count30 / denominator30) * 100) / 100 : 0,
        currentStreak: habit.current_streak,
        maxStreak: habit.max_streak,
        totalCompletions: habit.total_completions,
        streakHistory,
      },
      { origin }
    );
  });
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z');
  const b = new Date(to + 'T00:00:00Z');
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}
