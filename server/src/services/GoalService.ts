import type { SupabaseClient } from '@supabase/supabase-js';
import { toCamel } from '@/lib/utils/case';

/** Select string returning a Goal with joined category and milestones. */
export const GOAL_SELECT = `*, category:categories(id, name, slug, icon_name, color, description), milestones:goal_milestones(id, goal_id, title, completed, sort_order, xp_reward, completed_at, created_at)`;

interface RawGoal {
  milestones?: Array<Record<string, unknown>> | null;
  category?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/** Converts a raw Supabase goal row (with joins) into the camelCase Goal shape. */
export function transformGoal(row: RawGoal): Record<string, unknown> {
  const camel = toCamel<Record<string, unknown>>(row);
  // Sort milestones by sortOrder for consistent display
  if (Array.isArray(camel.milestones)) {
    (camel.milestones as Array<Record<string, unknown>>).sort(
      (a, b) => (a.sortOrder as number) - (b.sortOrder as number)
    );
  }
  if (camel.category === null) delete camel.category;
  return camel;
}

/** Fetches a single goal by id, scoped to the current user via RLS. */
export async function fetchGoal(supabase: SupabaseClient, goalId: string) {
  return supabase.from('goals').select(GOAL_SELECT).eq('id', goalId).single();
}
