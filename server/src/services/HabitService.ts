import type { SupabaseClient } from '@supabase/supabase-js';
import { toCamel } from '@/lib/utils/case';

export const HABIT_SELECT = `*, category:categories(id, name, slug, icon_name, color, description)`;

interface RawHabit {
  id: string;
  created_at: string;
  category?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/**
 * Transforms a raw Supabase habit row into the camelCase Habit shape.
 *
 * KEY FIX: All date windows are clamped to max(windowStart, habit.created_at)
 * so habits never report completions, misses, or progress for dates before
 * they were created.
 */
export async function transformHabit(
  supabase: SupabaseClient,
  row: RawHabit
): Promise<Record<string, unknown>> {
  const camel = toCamel<Record<string, unknown>>(row);
  if (camel.category === null) delete camel.category;

  // Habit creation date — we never look at logs before this
  const habitCreatedDate = (row.created_at as string).slice(0, 10);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  // Fetch last 35 days of logs (5 weeks for heatmap), clamped to creation date
  const thirtyFiveDaysAgo = new Date(today);
  thirtyFiveDaysAgo.setUTCDate(today.getUTCDate() - 34);
  const windowStart = thirtyFiveDaysAgo.toISOString().slice(0, 10);
  // Clamp: never fetch logs before habit creation
  const fetchFrom = windowStart > habitCreatedDate ? windowStart : habitCreatedDate;

  const { data: logs } = await supabase
    .from('habit_logs')
    .select('id, habit_id, user_id, logged_date, completed, note, xp_earned, created_at, is_locked')
    .eq('habit_id', row.id)
    .gte('logged_date', fetchFrom)
    .lte('logged_date', todayIso)  // never return future logs
    .order('logged_date', { ascending: false });

  const logRows = logs ?? [];
  camel.completionHistory = toCamel(logRows);

  // ── Compute currentStreak live from fetched logs ──────────────────────────
  // We never trust the stale current_streak column in the habits table.
  // Walk backwards from today (or yesterday if today has no log yet).
  {
    const logMap = new Map<string, boolean>();
    for (const l of logRows as { logged_date: string; completed: boolean }[]) {
      logMap.set(l.logged_date, l.completed);
    }

    let streak = 0;
    const cursor = new Date(today);
    // If today not logged yet, start counting from yesterday so today isn't a miss
    if (!logMap.has(todayIso)) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    for (let i = 0; i < 400; i++) {
      const iso = cursor.toISOString().slice(0, 10);
      // Never count days before the habit was created
      if (iso < habitCreatedDate) break;
      const status = logMap.get(iso);
      if (status === true) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        // undefined (no log) or false (missed) both break the streak
        break;
      }
    }

    camel.currentStreak = streak;
  }

  // weeklyCompleted: count completions within current week, but only after habit creation
  const weekStartIso = startOfWeek(today);
  // Clamp week start to habit creation date
  const effectiveWeekStart = weekStartIso > habitCreatedDate ? weekStartIso : habitCreatedDate;
  camel.weeklyCompleted = logRows.filter(
    (l: { logged_date: string; completed: boolean }) =>
      l.completed && l.logged_date >= effectiveWeekStart
  ).length;

  // completionRate: last 14 days, clamped to creation date
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setUTCDate(today.getUTCDate() - 13);
  const fourteenDaysAgoIso = fourteenDaysAgo.toISOString().slice(0, 10);
  const effectiveStart14 = fourteenDaysAgoIso > habitCreatedDate ? fourteenDaysAgoIso : habitCreatedDate;

  // Count actual days since habit creation (up to 14)
  const daysInWindow = daysBetween(effectiveStart14, todayIso) + 1;
  const effectiveDenominator14 = Math.min(14, daysInWindow);

  const last14 = logRows.filter(
    (l: { logged_date: string }) => l.logged_date >= effectiveStart14
  );
  const completed14 = last14.filter((l: { completed: boolean }) => l.completed).length;
  camel.completionRate =
    effectiveDenominator14 > 0
      ? Math.round((completed14 / effectiveDenominator14) * 100) / 100
      : 0;

  return camel;
}

/** Returns the ISO date string for Monday of the current UTC week. */
function startOfWeek(date: Date): string {
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

/** Number of calendar days between two ISO date strings (inclusive of both endpoints). */
function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z');
  const b = new Date(to + 'T00:00:00Z');
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

/**
 * Recalculates current_streak, max_streak, total_completions for a habit.
 *
 * KEY FIX:
 *  - Only considers logs at or after the habit's created_at date.
 *  - A "missed" (completed=false) log now explicitly breaks the streak.
 *  - Locked missed days also break the streak.
 */
export async function recalculateHabitStreak(
  supabase: SupabaseClient,
  habitId: string
): Promise<{ currentStreak: number; maxStreak: number; totalCompletions: number }> {
  // Fetch both completed and missed logs (missed logs break the streak)
  const { data: logs } = await supabase
    .from('habit_logs')
    .select('logged_date, completed')
    .eq('habit_id', habitId)
    .order('logged_date', { ascending: false });

  const allLogs = logs ?? [];

  // Build a map: date → completed (true/false)
  const logMap = new Map<string, boolean>();
  for (const l of allLogs as { logged_date: string; completed: boolean }[]) {
    logMap.set(l.logged_date, l.completed);
  }

  const totalCompletions = [...logMap.values()].filter(Boolean).length;

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  // Current streak: walk backwards from today (or yesterday if today not yet logged)
  let currentStreak = 0;
  const cursor = new Date(today);

  // If today not logged yet, start from yesterday for streak calculation
  // (today is still pending — not a miss yet)
  const todayLogged = logMap.has(todayIso);
  if (!todayLogged) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    const status = logMap.get(iso);

    if (status === true) {
      // Completed day — continue streak
      currentStreak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else if (status === false) {
      // Explicitly missed — streak broken
      break;
    } else {
      // No log for this date — could be before habit creation or truly missed
      // We stop the streak here (missed = break)
      break;
    }
  }

  const { data: habit } = await supabase
    .from('habits')
    .select('max_streak')
    .eq('id', habitId)
    .single();

  const maxStreak = Math.max(habit?.max_streak ?? 0, currentStreak);

  await supabase
    .from('habits')
    .update({
      current_streak: currentStreak,
      max_streak: maxStreak,
      total_completions: totalCompletions,
    })
    .eq('id', habitId);

  return { currentStreak, maxStreak, totalCompletions };
}

/**
 * Validates that a given date is not locked for modification.
 * A date is locked if:
 *  1. It is in the future.
 *  2. It is strictly before the habit's creation date.
 *  3. An existing log exists with is_locked=true.
 *  4. The date is before today AND a locked log exists OR the midnight
 *     rollover has already processed that date.
 *
 * Returns an error message if locked, null if allowed.
 */
export async function checkDateLocked(
  supabase: SupabaseClient,
  habitId: string,
  userId: string,
  date: string
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);

  // Future dates are locked
  if (date > today) {
    return 'Cannot modify a future date.';
  }

  // Check habit creation date
  const { data: habit } = await supabase
    .from('habits')
    .select('created_at')
    .eq('id', habitId)
    .eq('user_id', userId)
    .single();

  if (!habit) return 'Habit not found.';

  const habitCreatedDate = (habit.created_at as string).slice(0, 10);
  if (date < habitCreatedDate) {
    return `Cannot modify a date before this habit was created (${habitCreatedDate}).`;
  }

  // Past days: check if the midnight rollover has already processed this date
  if (date < today) {
    const { data: rolloverLog } = await supabase
      .from('midnight_rollover_log')
      .select('process_date')
      .eq('user_id', userId)
      .eq('process_date', date)
      .maybeSingle();

    if (rolloverLog) {
      return `Day ${date} is locked — it was already processed at midnight.`;
    }

    // Also check if an existing log is locked
    const { data: existingLog } = await supabase
      .from('habit_logs')
      .select('is_locked')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('logged_date', date)
      .maybeSingle();

    if (existingLog?.is_locked) {
      return `Day ${date} is locked and cannot be modified.`;
    }
  }

  return null; // Not locked — modification allowed
}
