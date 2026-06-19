import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { createChallengeSchema } from '@/schemas/community.schema';
import { CHALLENGE_SELECT, transformChallenge } from '@/services/ChallengeService';

export const OPTIONS = handleOptions;

/** GET /api/v1/challenges — open/active/completed challenges (per RLS), newest first. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { page, limit, offset } = parsePagination(request);

    const { data, error, count } = await supabase
      .from('challenges')
      .select(CHALLENGE_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const challenges = await Promise.all((data ?? []).map((row) => transformChallenge(supabase, row, userId)));
    return jsonPaginated(challenges, paginationMeta(page, limit, count ?? 0), { origin });
  });
}

/** POST /api/v1/challenges — create a challenge (creator does NOT auto-join). */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const input = await parseBody(request, createChallengeSchema);

    if (new Date(input.endDate) <= new Date(input.startDate)) {
      throw new ApiException('VALIDATION_ERROR', 'endDate must be after startDate.');
    }

    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert({
        creator_id: userId,
        group_id: input.groupId ?? null,
        title: input.title,
        description: input.description ?? null,
        difficulty: input.difficulty,
        xp_reward: input.xpReward ?? 1000,
        start_date: input.startDate,
        end_date: input.endDate,
        max_participants: input.maxParticipants ?? null,
        goal_type: input.goalType,
        goal_target: input.goalTarget,
        status: 'open',
      })
      .select(CHALLENGE_SELECT)
      .single();

    if (error || !challenge) throw new ApiException('INTERNAL_ERROR', 'Failed to create challenge.');

    return jsonOk(await transformChallenge(supabase, challenge, userId), { origin, status: 201 });
  });
}
