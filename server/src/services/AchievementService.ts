import type { SupabaseClient } from '@supabase/supabase-js';
import { awardXp } from './XpService';
import { postActivity } from './CommunityService';
import { sendNotification } from './NotificationService';

interface AchievementRow {
  id: string;
  slug: string;
  title: string;
  xp_bonus: number;
  trigger_type: string;
  trigger_value: Record<string, unknown>;
}

type Checker = (userId: string, supabase: SupabaseClient, triggerValue: Record<string, unknown>) => Promise<boolean>;

/**
 * FIX: Checkers are now keyed by trigger_type (not slug), so the seed
 * data's generic slugs (quest_count_n_10, streak_n_3, etc.) are all
 * handled by the correct checker via their trigger_type field.
 *
 * The four hardcoded slug checkers remain for backward compatibility
 * but are now redundant — they map to the same trigger_type handlers.
 */
const CHECKERS_BY_TRIGGER_TYPE: Record<string, Checker> = {
  quest_count: async (userId, sb, trigger) => {
    const target = Number(trigger.count ?? 0);
    if (!target) return false;
    const { count } = await sb
      .from('daily_quests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true);
    return (count ?? 0) >= target;
  },

  streak: async (userId, sb, trigger) => {
    const target = Number(trigger.days ?? 0);
    if (!target) return false;
    const { data } = await sb.from('profiles').select('current_streak').eq('id', userId).single();
    return (data?.current_streak ?? 0) >= target;
  },

  level: async (userId, sb, trigger) => {
    const target = Number(trigger.level ?? 0);
    if (!target) return false;
    const { data } = await sb.from('profiles').select('level').eq('id', userId).single();
    return (data?.level ?? 0) >= target;
  },

  habit: async (userId, sb, trigger) => {
    const target = Number(trigger.totalCompletions ?? 0);
    if (!target) return false;
    const { data } = await sb.from('habits').select('total_completions').eq('user_id', userId);
    const total = (data ?? []).reduce(
      (sum: number, h: { total_completions: number }) => sum + (h.total_completions ?? 0),
      0
    );
    return total >= target;
  },
};

/**
 * Checks all not-yet-unlocked achievements for a user and unlocks any
 * that now qualify. Dispatches by trigger_type (not slug) so all seeded
 * achievements are handled generically without per-slug code.
 */
export async function checkAndUnlockAchievements(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data: allAchievements } = await supabase.from('achievements').select('*');
  const { data: unlocked } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const unlockedIds = new Set(
    (unlocked ?? []).map((u: { achievement_id: string }) => u.achievement_id)
  );
  const newlyUnlocked: string[] = [];

  for (const achievement of (allAchievements ?? []) as AchievementRow[]) {
    if (unlockedIds.has(achievement.id)) continue;

    // FIX: dispatch by trigger_type, not slug
    const checker = CHECKERS_BY_TRIGGER_TYPE[achievement.trigger_type];
    if (!checker) continue;

    let qualified = false;
    try {
      qualified = await checker(userId, supabase, achievement.trigger_value ?? {});
    } catch (err) {
      console.error(`Achievement checker failed for ${achievement.slug}:`, err);
      continue;
    }
    if (!qualified) continue;

    const { error: insertError } = await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_id: achievement.id,
      xp_awarded: achievement.xp_bonus,
    });
    if (insertError) {
      // Unique violation = race with another request; skip silently.
      continue;
    }

    // FIX: atomic increment via RPC instead of read-then-write
    await supabase.rpc('increment_profile_counter', {
      p_user_id: userId,
      p_column: 'achievements_count',
    });

    if (achievement.xp_bonus > 0) {
      await awardXp(
        supabase,
        userId,
        achievement.xp_bonus,
        'achievement',
        achievement.id,
        `Achievement unlocked: ${achievement.title}`
      );
    }

    await sendNotification(supabase, userId, {
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: `You earned: ${achievement.title}`,
      data: { achievementId: achievement.id, slug: achievement.slug },
    });

    await postActivity(supabase, userId, 'achieved', achievement.title, 'achievement', achievement.id, 0);

    newlyUnlocked.push(achievement.id);
  }

  return newlyUnlocked;
}
