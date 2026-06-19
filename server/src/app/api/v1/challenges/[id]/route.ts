import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { CHALLENGE_SELECT, transformChallenge } from '@/services/ChallengeService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/challenges/:id */
export async function GET(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data, error } = await supabase.from('challenges').select(CHALLENGE_SELECT).eq('id', id).single();
    if (error || !data) throw new ApiException('NOT_FOUND', 'Challenge not found.');

    return jsonOk(await transformChallenge(supabase, data, userId), { origin });
  });
}
