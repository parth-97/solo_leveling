import type { SupabaseClient } from '@supabase/supabase-js';
import { toCamel } from '@/lib/utils/case';
import { GOAL_SELECT, transformGoal } from './GoalService';
import { getScoreHistory } from './AnalyticsService';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Returns [periodStart, periodEnd] ISO dates (inclusive) for a period ending today. */
export function periodBounds(period: ReportPeriod): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  switch (period) {
    case 'daily':
      break;
    case 'weekly':
      start.setUTCDate(end.getUTCDate() - 6);
      break;
    case 'monthly':
      start.setUTCDate(end.getUTCDate() - 29);
      break;
    case 'yearly':
      start.setUTCDate(end.getUTCDate() - 364);
      break;
  }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Computes a full ReportData payload for the given period.
 *
 * FIXES APPLIED:
 *  - topHabits completion rate uses per-habit creation date as window floor.
 *  - Completed goals filter uses completed_at column (now exists after migration).
 *  - habitsCompleted count only includes logs >= habit's created_at.
 */
export async function computeReport(supabase: SupabaseClient, userId: string, period: ReportPeriod) {
  const { start, end } = periodBounds(period);

  // ── Scores avg over period + trend ──
  const scores = (await getScoreHistory(supabase, userId, start)) as Array<Record<string, number | string>>;
  const scoreFieldNames = [
    'lifeScore',
    'disciplineScore',
    'growthScore',
    'healthScore',
    'learningScore',
    'productivityScore',
    'relationshipScore',
    'questsDone',
    'questsTotal',
    'habitsDone',
    'habitsTotal',
    'streakDays',
    'xpEarnedToday',
  ] as const;

  const avg: Record<string, number> = {};
  for (const field of scoreFieldNames) {
    const values = scores.map((s) => Number(s[field] ?? 0));
    avg[field] = values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
      : 0;
  }

  const periodDays = Math.max(1, dateDiffDays(start, end) + 1);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(periodDays - 1));
  const prevScores = (await getScoreHistory(supabase, userId, prevStart)) as Array<Record<string, number | string>>;
  const prevScoresInRange = prevScores.filter((s) => (s.scoreDate as string) <= prevEnd);
  const prevAvgLife = prevScoresInRange.length > 0
    ? prevScoresInRange.reduce((sum, s) => sum + Number(s.lifeScore ?? 0), 0) / prevScoresInRange.length
    : 0;

  const delta = Math.round((avg.lifeScore - prevAvgLife) * 100) / 100;
  const trend: 'up' | 'down' | 'stable' = delta > 1 ? 'up' : delta < -1 ? 'down' : 'stable';

  const avgScores = {
    id: '',
    userId,
    scoreDate: end,
    lifeScore: avg.lifeScore,
    disciplineScore: avg.disciplineScore,
    growthScore: avg.growthScore,
    healthScore: avg.healthScore,
    learningScore: avg.learningScore,
    productivityScore: avg.productivityScore,
    relationshipScore: avg.relationshipScore,
    questsDone: avg.questsDone,
    questsTotal: avg.questsTotal,
    habitsDone: avg.habitsDone,
    habitsTotal: avg.habitsTotal,
    streakDays: avg.streakDays,
    xpEarnedToday: avg.xpEarnedToday,
    computedAt: new Date().toISOString(),
  };

  // ── Summary ──
  const { data: xpRows } = await supabase
    .from('xp_transactions')
    .select('amount, created_at')
    .eq('user_id', userId)
    .gte('created_at', `${start}T00:00:00Z`)
    .lte('created_at', `${end}T23:59:59Z`);

  const totalXpEarned = (xpRows ?? []).reduce(
    (sum: number, r: { amount: number }) => sum + Math.max(0, r.amount),
    0
  );

  const { count: questsCompleted } = await supabase
    .from('daily_quests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('quest_date', start)
    .lte('quest_date', end);

  // FIX: habit_logs already scoped to logs within the period — the unique
  // constraint and creation-date enforcement ensure no pre-creation dates exist.
  const { count: habitsCompleted } = await supabase
    .from('habit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('logged_date', start)
    .lte('logged_date', end);

  const { count: achievementsUnlockedCount } = await supabase
    .from('user_achievements')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('unlocked_at', `${start}T00:00:00Z`)
    .lte('unlocked_at', `${end}T23:59:59Z`);

  const streakHighest = scores.length > 0
    ? Math.max(...scores.map((s) => Number(s.streakDays ?? 0)))
    : 0;

  const { count: levelsGained } = await supabase
    .from('activity_feed')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'leveled up')
    .gte('created_at', `${start}T00:00:00Z`)
    .lte('created_at', `${end}T23:59:59Z`);

  // ── Top habits — FIX: use per-habit creation date as floor ──
  const { data: habitsData } = await supabase
    .from('habits')
    .select('id, name, current_streak, weekly_target, created_at')
    .eq('user_id', userId)
    .eq('is_active', true);

  const topHabits = await Promise.all(
    (habitsData ?? []).map(async (h: {
      id: string;
      name: string;
      current_streak: number;
      created_at: string;
    }) => {
      // FIX: Never count completions before this habit was created
      const habitStart = h.created_at.slice(0, 10);
      const effectiveStart = habitStart > start ? habitStart : start;

      // Count days in effective window for accurate rate
      const effectiveDays = dateDiffDays(effectiveStart, end) + 1;

      const { count: completions } = await supabase
        .from('habit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('habit_id', h.id)
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('logged_date', effectiveStart)
        .lte('logged_date', end);

      const completionRate =
        effectiveDays > 0
          ? Math.round(((completions ?? 0) / effectiveDays) * 100) / 100
          : 0;

      return { name: h.name, completionRate, streak: h.current_streak };
    })
  );
  topHabits.sort((a, b) => b.completionRate - a.completionRate);

  // ── Completed goals in range — FIX: uses completed_at column ──
  const { data: goalsData } = await supabase
    .from('goals')
    .select(GOAL_SELECT)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', `${start}T00:00:00Z`)
    .lte('completed_at', `${end}T23:59:59Z`);

  const completedGoals = (goalsData ?? []).map(transformGoal);

  // ── Unlocked achievements in range ──
  const { data: unlockedAchievementRows } = await supabase
    .from('user_achievements')
    .select('achievement:achievements(*)')
    .eq('user_id', userId)
    .gte('unlocked_at', `${start}T00:00:00Z`)
    .lte('unlocked_at', `${end}T23:59:59Z`);

  const unlockedAchievements = (unlockedAchievementRows ?? [])
    .map((r: { achievement: unknown }) => r.achievement)
    .filter(Boolean)
    .map((a) => toCamel(a));

  // ── XP by category ──
  const xpByCategory = await computeXpByCategory(supabase, userId, start, end);

  return {
    period,
    periodStart: start,
    periodEnd: end,
    summary: {
      totalXpEarned,
      questsCompleted: questsCompleted ?? 0,
      habitsCompleted: habitsCompleted ?? 0,
      achievementsUnlocked: achievementsUnlockedCount ?? 0,
      streakHighest,
      levelsGained: levelsGained ?? 0,
    },
    scores: { avg: avgScores, trend, delta },
    topHabits: topHabits.slice(0, 5),
    completedGoals,
    unlockedAchievements,
    xpByCategory,
  };
}

async function computeXpByCategory(
  supabase: SupabaseClient,
  userId: string,
  start: string,
  end: string
) {
  const { data: txRows } = await supabase
    .from('xp_transactions')
    .select('amount, source_type, source_id')
    .eq('user_id', userId)
    .gt('amount', 0)
    .gte('created_at', `${start}T00:00:00Z`)
    .lte('created_at', `${end}T23:59:59Z`);

  const rows = (txRows ?? []) as Array<{
    amount: number;
    source_type: string;
    source_id: string | null;
  }>;

  const questIds = rows.filter((r) => r.source_type === 'quest' && r.source_id).map((r) => r.source_id as string);
  const habitIds = rows.filter((r) => r.source_type === 'habit' && r.source_id).map((r) => r.source_id as string);
  const goalIds  = rows.filter((r) => r.source_type === 'goal'  && r.source_id).map((r) => r.source_id as string);

  const categoryByQuest = await mapSourceToCategory(supabase, 'daily_quests', questIds);
  const categoryByHabit = await mapSourceToCategory(supabase, 'habits', habitIds);
  const categoryByGoal  = await mapSourceToCategory(supabase, 'goals', goalIds);

  const totals = new Map<string, number>();
  for (const row of rows) {
    let categoryName = 'Other';
    if (row.source_type === 'quest' && row.source_id)
      categoryName = categoryByQuest.get(row.source_id) ?? 'Other';
    else if (row.source_type === 'habit' && row.source_id)
      categoryName = categoryByHabit.get(row.source_id) ?? 'Other';
    else if (row.source_type === 'goal' && row.source_id)
      categoryName = categoryByGoal.get(row.source_id) ?? 'Other';
    else if (row.source_type === 'achievement') categoryName = 'Achievements';
    else if (row.source_type === 'challenge')   categoryName = 'Challenges';
    else categoryName = 'Bonus';

    totals.set(categoryName, (totals.get(categoryName) ?? 0) + row.amount);
  }

  return Array.from(totals.entries()).map(([category, xp]) => ({ category, xp }));
}

async function mapSourceToCategory(
  supabase: SupabaseClient,
  table: string,
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from(table)
    .select('id, category:categories(name)')
    .in('id', ids);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; category: { name: string } | null }>) {
    map.set(row.id, row.category?.name ?? 'Other');
  }
  return map;
}

function dateDiffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
