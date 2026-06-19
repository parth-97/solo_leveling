import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/utils/cronAuth';
import { withErrorHandling, jsonOk } from '@/lib/utils/response';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/internal/cron/midnight-rollover
 *
 * Master midnight processing job. Runs once per day, shortly after
 * midnight UTC. For each active user it:
 *
 *  1. Locks yesterday's habit logs (is_locked = true).
 *  2. Auto-inserts missed habit logs for habits with no log yesterday.
 *  3. Deducts XP for each missed habit.
 *  4. Recalculates streaks for all habits + user-level streak.
 *  5. Processes overdue goals (deadline passed, still active → failed + 2× penalty).
 *  6. Records a midnight_rollover_log row to prevent double-processing.
 *
 * Idempotency: the midnight_rollover_log PK (user_id, process_date)
 * ensures this is safe to retry — duplicate runs for the same date are no-ops.
 *
 * Schedule: daily at 00:05 UTC (5 minutes after midnight)
 *
 * Trigger:
 *   POST /api/internal/cron/midnight-rollover
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    requireCronAuth(request);

    const supabase = createAdminClient();

    // The date we're rolling over (yesterday from the cron's perspective)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayIso = yesterday.toISOString().slice(0, 10);

    // Get all active users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .order('created_at', { ascending: true });

    if (profilesError) throw profilesError;

    const allProfiles = profiles ?? [];
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    let totalMissed = 0;
    let totalLocked = 0;

    for (const profile of allProfiles) {
      try {
        // Use the DB function which is fully idempotent
        const { data: result, error: rpcError } = await supabase
          .rpc('midnight_rollover_for_user', {
            p_user_id: profile.id,
            p_yesterday: yesterdayIso,
          })
          .single();

        if (rpcError) {
          console.error(`Rollover error for user ${profile.id}:`, rpcError);
          errors++;
          continue;
        }

        const rolloverResult = result as {
          skipped: boolean;
          habitsLocked?: number;
          habitsMissed?: number;
          goalsPenalized?: number;
        };

        if (rolloverResult.skipped) {
          skipped++;
        } else {
          processed++;
          totalLocked += rolloverResult.habitsLocked ?? 0;
          totalMissed += rolloverResult.habitsMissed ?? 0;
        }
      } catch (err) {
        console.error(`Uncaught rollover error for user ${profile.id}:`, err);
        errors++;
      }
    }

    // Process overdue goals globally (one pass)
    const { data: goalsPenalized } = await supabase
      .rpc('process_overdue_goals')
      .single();

    // Also run the streaks cron logic for safety (some users may not have
    // any habits — their streak still needs resetting)
    for (const profile of allProfiles) {
      await supabase.rpc('recalculate_streak', { p_user_id: profile.id }).catch(() => {});
    }

    return jsonOk(
      {
        date: yesterdayIso,
        totalUsers: allProfiles.length,
        processed,
        skipped,
        errors,
        totalHabitsLocked: totalLocked,
        totalHabitsMissed: totalMissed,
        totalGoalsPenalized: goalsPenalized ?? 0,
      },
      { origin }
    );
  });
}
