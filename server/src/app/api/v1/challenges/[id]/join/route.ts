import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { CHALLENGE_SELECT, transformChallenge } from '@/services/ChallengeService';
import { postActivity } from '@/services/CommunityService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** POST /api/v1/challenges/:id/join */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, status, max_participants, participant_count, end_date')
      .eq('id', id)
      .single();

    if (challengeError || !challenge) throw new ApiException('NOT_FOUND', 'Challenge not found.');
    if (!['open', 'active'].includes(challenge.status)) throw new ApiException('CONFLICT', 'This challenge is no longer accepting participants.');
    if (new Date(challenge.end_date) < new Date()) throw new ApiException('CONFLICT', 'This challenge has ended.');
    if (challenge.max_participants && challenge.participant_count >= challenge.max_participants) {
      throw new ApiException('CONFLICT', 'This challenge is full.');
    }

    const { data: existing } = await supabase.from('challenge_participants').select('id').eq('challenge_id', id).eq('user_id', userId).maybeSingle();
    if (existing) throw new ApiException('CONFLICT', 'You have already joined this challenge.');

    const { error: insertError } = await supabase.from('challenge_participants').insert({ challenge_id: id, user_id: userId });
    if (insertError) throw new ApiException('INTERNAL_ERROR', 'Failed to join challenge.');

    await supabase.from('challenges').update({ participant_count: challenge.participant_count + 1 }).eq('id', id);

    await postActivity(supabase, userId, 'joined', challenge.title, 'challenge', id, 0);

    const { data: updated, error } = await supabase.from('challenges').select(CHALLENGE_SELECT).eq('id', id).single();
    if (error || !updated) throw new ApiException('INTERNAL_ERROR', 'Joined but failed to load challenge.');

    return jsonOk(await transformChallenge(supabase, updated, userId), { origin });
  });
}
