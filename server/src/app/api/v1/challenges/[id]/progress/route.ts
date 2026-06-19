import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { updateChallengeProgressSchema } from '@/schemas/community.schema';
import { toCamel } from '@/lib/utils/case';
import { awardXp } from '@/services/XpService';
import { postActivity } from '@/services/CommunityService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/v1/challenges/:id/progress — update the current user's
 * progress (0-100) on a challenge they've joined. Reaching 100 marks
 * `completed=true`, awards the challenge's xp_reward (once), and posts
 * to the activity feed.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;
    const { progress } = await parseBody(request, updateChallengeProgressSchema);

    const { data: participant, error: fetchError } = await supabase
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !participant) throw new ApiException('NOT_FOUND', 'You have not joined this challenge.');

    const willComplete = progress >= 100 && !participant.completed;

    const updates: Record<string, unknown> = { progress };
    if (willComplete) {
      updates.completed = true;
      updates.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase.from('challenge_participants').update(updates).eq('id', participant.id);
    if (updateError) throw new ApiException('INTERNAL_ERROR', 'Failed to update progress.');

    if (willComplete) {
      const { data: challenge } = await supabase.from('challenges').select('title, xp_reward').eq('id', id).single();
      if (challenge) {
        await awardXp(supabase, userId, challenge.xp_reward, 'challenge', id, `Challenge completed: ${challenge.title}`);
        await supabase.from('challenge_participants').update({ xp_earned: challenge.xp_reward }).eq('id', participant.id);
        await postActivity(supabase, userId, 'completed', challenge.title, 'challenge', id, challenge.xp_reward);
      }
    }

    const { data: updated, error } = await supabase.from('challenge_participants').select('*').eq('id', participant.id).single();
    if (error || !updated) throw new ApiException('INTERNAL_ERROR', 'Progress updated but failed to load.');

    return jsonOk(toCamel(updated), { origin });
  });
}
