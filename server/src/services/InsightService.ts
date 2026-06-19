import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generates AI insights for a user using rule-based heuristics over
 * their profile/habits/scores data.
 *
 * files/06_security_and_scalability.md references AI-generated insights
 * but does not specify an LLM provider or prompt — wiring an actual
 * LLM call (e.g. Anthropic API) is a documented extension point below.
 * This rule-based implementation provides genuinely useful, data-driven
 * insights without an external dependency, and can be swapped or
 * augmented later without changing the route contract.
 */
export async function generateInsights(supabase: SupabaseClient, userId: string): Promise<Array<{ type: string; title: string; message: string; action: string | null }>> {
  const insights: Array<{ type: string; title: string; message: string; action: string | null }> = [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, max_streak, level, discipline_score, growth_score, health_score, learning_score, productivity_score, relationship_score, life_score')
    .eq('id', userId)
    .single();

  if (profile) {
    if (profile.current_streak >= 7) {
      insights.push({
        type: 'insight',
        title: 'Streak Milestone',
        message: `You're on a ${profile.current_streak}-day streak — your longest in a while. Keep the momentum going!`,
        action: 'View habits',
      });
    } else if (profile.current_streak === 0) {
      insights.push({
        type: 'warning',
        title: 'Streak Reset',
        message: 'Your streak reset. Complete a quest or habit today to start a new one.',
        action: 'View daily quests',
      });
    }

    const scores: Array<{ key: string; label: string; value: number }> = [
      { key: 'discipline_score', label: 'Discipline', value: profile.discipline_score },
      { key: 'growth_score', label: 'Growth', value: profile.growth_score },
      { key: 'health_score', label: 'Health', value: profile.health_score },
      { key: 'learning_score', label: 'Learning', value: profile.learning_score },
      { key: 'productivity_score', label: 'Productivity', value: profile.productivity_score },
      { key: 'relationship_score', label: 'Relationships', value: profile.relationship_score },
    ];

    const lowest = scores.reduce((min, s) => (s.value < min.value ? s : min), scores[0]);
    if (lowest.value < 40) {
      insights.push({
        type: 'suggestion',
        title: `${lowest.label} Needs Attention`,
        message: `Your ${lowest.label.toLowerCase()} score is ${Math.round(lowest.value)}/100 — the lowest of your stats. Consider adding a habit or goal in this area.`,
        action: 'Browse goals',
      });
    }

    const highest = scores.reduce((max, s) => (s.value > max.value ? s : max), scores[0]);
    if (highest.value >= 80) {
      insights.push({
        type: 'insight',
        title: `${highest.label} Excellence`,
        message: `Your ${highest.label.toLowerCase()} score is ${Math.round(highest.value)}/100 — among the best of all hunters. Great work!`,
        action: null,
      });
    }
  }

  // Habit-specific insight: any habit at risk of breaking its streak today
  const { data: habits } = await supabase
    .from('habits')
    .select('id, name, current_streak, weekly_target')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gte('current_streak', 3);

  if (habits && habits.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    for (const habit of habits as Array<{ id: string; name: string; current_streak: number }>) {
      const { data: todayLog } = await supabase.from('habit_logs').select('id').eq('habit_id', habit.id).eq('logged_date', today).maybeSingle();
      if (!todayLog) {
        insights.push({
          type: 'warning',
          title: 'Streak at Risk',
          message: `"${habit.name}" has a ${habit.current_streak}-day streak that hasn't been logged today.`,
          action: 'Log habit',
        });
        break; // only surface one streak warning to avoid noise
      }
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'insight',
      title: 'Getting Started',
      message: 'Complete a few quests and habits to start seeing personalized insights here.',
      action: null,
    });
  }

  return insights.slice(0, 5);
}
