import type { SupabaseClient } from '@supabase/supabase-js';
import type { AwardXpResult } from '@/types/shared';

/**
 * Awards (or deducts) XP via the `award_xp` Postgres function
 * (files/03_analytics_engine.sql). That function handles:
 *  - updating profiles.xp / level / rank / xp_to_next_level / total_xp_earned
 *  - inserting an immutable xp_transactions ledger row
 *  - posting a "leveled up" activity_feed entry on level-up
 *
 * Runs through the request-scoped (RLS) client — the RPC is
 * SECURITY DEFINER so it can update profiles regardless of the
 * profiles_update_own RLS policy, but still operates on p_user_id only.
 */
export async function awardXp(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  sourceType: 'quest' | 'habit' | 'goal' | 'achievement' | 'challenge' | 'bonus',
  sourceId: string | null,
  description: string
): Promise<AwardXpResult> {
  const { data, error } = await supabase
    .rpc('award_xp', {
      p_user_id: userId,
      p_amount: amount,
      p_source_type: sourceType,
      p_source_id: sourceId,
      p_description: description,
    })
    .single();

  if (error) throw error;

  const row = data as { new_xp: number; new_level: number; leveled_up: boolean; new_rank: AwardXpResult['newRank'] };

  return {
    newXp: row.new_xp,
    newLevel: row.new_level,
    leveledUp: row.leveled_up,
    newRank: row.new_rank,
  };
}

/** Recalculates the user's current/max streak via `recalculate_streak`. */
export async function recalculateStreak(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('recalculate_streak', { p_user_id: userId });
  if (error) throw error;
  return data as number;
}
