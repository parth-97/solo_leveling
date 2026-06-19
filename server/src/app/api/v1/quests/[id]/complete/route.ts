// server/src/app/api/v1/quests/[id]/complete/route.ts
// FIX: replaces read-then-write quests_completed increment with atomic RPC call

import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';
import { awardXp, recalculateStreak } from '@/services/XpService';
import { postActivity } from '@/services/CommunityService';
import { checkAndUnlockAchievements } from '@/services/AchievementService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

const QUEST_SELECT = `*, category:categories(id, name, slug, icon_name, color, description)`;

/**
 * POST /api/v1/quests/:id/complete
 * Marks a daily quest complete, awards its xp_reward, recalculates the
 * user's streak, posts to the activity feed, and checks achievements.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: quest, error: fetchError } = await supabase
      .from('daily_quests')
      .select('id, title, xp_reward, completed, expires_at')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !quest) throw new ApiException('NOT_FOUND', 'Quest not found.');
    if (quest.completed) throw new ApiException('CONFLICT', 'Quest already completed.');

    if (new Date(quest.expires_at) < new Date()) {
      throw new ApiException('CONFLICT', 'This quest has expired.');
    }

    const { error: updateError } = await supabase
      .from('daily_quests')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw new ApiException('INTERNAL_ERROR', 'Failed to complete quest.');

    const xpResult = await awardXp(
      supabase,
      userId,
      quest.xp_reward,
      'quest',
      id,
      `Quest completed: ${quest.title}`
    );

    await recalculateStreak(supabase, userId);

    // FIX: atomic increment via RPC — no race condition
    await supabase.rpc('increment_profile_counter', {
      p_user_id: userId,
      p_column: 'quests_completed',
    });

    await postActivity(supabase, userId, 'completed', quest.title, 'quest', id, quest.xp_reward);
    const achievementIds = await checkAndUnlockAchievements(supabase, userId);

    const { data: updatedQuest, error } = await supabase
      .from('daily_quests')
      .select(QUEST_SELECT)
      .eq('id', id)
      .single();

    if (error || !updatedQuest) throw new ApiException('INTERNAL_ERROR', 'Quest completed but failed to load.');

    let achievements: unknown[] = [];
    if (achievementIds.length > 0) {
      const { data: achData } = await supabase.from('achievements').select('*').in('id', achievementIds);
      achievements = toCamel(achData ?? []);
    }

    return jsonOk(
      {
        quest: toCamel(updatedQuest),
        xpAwarded: quest.xp_reward,
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newLevel,
        newRank: xpResult.newRank,
        achievementsUnlocked: achievements,
      },
      { origin }
    );
  });
}
