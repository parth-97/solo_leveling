import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityAction } from '@/types/shared';

/**
 * Posts an entry to the activity_feed table (used for the "Recent
 * Activity" feed on the Community page, and to power relationship-score
 * "friend interactions" inputs in compute_scores).
 */
export async function postActivity(
  supabase: SupabaseClient,
  userId: string,
  action: ActivityAction,
  target: string,
  sourceType: string,
  sourceId: string | null,
  xpEarned: number,
  isPublic = true
): Promise<void> {
  await supabase.from('activity_feed').insert({
    user_id: userId,
    action,
    target,
    source_type: sourceType,
    source_id: sourceId,
    xp_earned: xpEarned,
    is_public: isPublic,
  });
}
