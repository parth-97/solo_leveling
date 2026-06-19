import type { SupabaseClient } from '@supabase/supabase-js';
import { toCamel } from '@/lib/utils/case';

const SCORE_FIELDS =
  'id, user_id, score_date, life_score, discipline_score, growth_score, health_score, learning_score, productivity_score, relationship_score, quests_done, quests_total, habits_done, habits_total, streak_days, xp_earned_today, computed_at';

/**
 * Ensures today's analytics_scores snapshot exists/is fresh by calling
 * `upsert_analytics_snapshot` (files/03_analytics_engine.sql), then
 * returns the row in camelCase AnalyticsScores shape.
 */
export async function getOrComputeTodayScores(supabase: SupabaseClient, userId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const { error: rpcError } = await supabase.rpc('upsert_analytics_snapshot', { p_user_id: userId, p_date: today });
  if (rpcError) {
    // Surface the real Postgres error instead of letting the .single() call
    // below fail with a misleading "0 rows" / PGRST116 once the snapshot
    // write didn't happen.
    throw new Error(`upsert_analytics_snapshot failed: ${rpcError.message}`);
  }

  const { data, error } = await supabase.from('analytics_scores').select(SCORE_FIELDS).eq('user_id', userId).eq('score_date', today).single();

  if (error || !data) throw error ?? new Error('Failed to compute today\'s scores.');
  return toCamel(data);
}

/** Fetches historical analytics_scores rows for a date range, oldest first. */
export async function getScoreHistory(supabase: SupabaseClient, userId: string, since: string) {
  const { data, error } = await supabase
    .from('analytics_scores')
    .select(SCORE_FIELDS)
    .eq('user_id', userId)
    .gte('score_date', since)
    .order('score_date', { ascending: true });

  if (error) throw error;
  return toCamel<Array<Record<string, unknown>>>(data ?? []);
}

/** Maps a `period` query value (week|month|year) to a "since" ISO date. */
export function periodToSinceDate(period: 'week' | 'month' | 'year'): string {
  const now = new Date();
  const since = new Date(now);
  if (period === 'week') since.setDate(now.getDate() - 6);
  else if (period === 'month') since.setDate(now.getDate() - 29);
  else since.setDate(now.getDate() - 364);
  return since.toISOString().slice(0, 10);
}
