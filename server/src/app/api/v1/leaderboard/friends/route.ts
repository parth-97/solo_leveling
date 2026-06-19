import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { reportPeriodSchema } from '@/schemas/analytics.schema';
import { parseQuery } from '@/lib/utils/validation';
import { getLeaderboard } from '@/services/LeaderboardService';
import { z } from 'zod';

export const OPTIONS = handleOptions;

const querySchema = z.object({ period: reportPeriodSchema });

/**
 * GET /api/v1/leaderboard/friends?period= — leaderboard restricted to
 * the current user's accepted friends (+ self), computed on-the-fly
 * since no per-friend-group snapshot table exists.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const { period } = parseQuery(url.searchParams, querySchema);

    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    const friendIds = new Set<string>([userId]);
    for (const f of (friendships ?? []) as Array<{ requester_id: string; addressee_id: string }>) {
      friendIds.add(f.requester_id === userId ? f.addressee_id : f.requester_id);
    }

    const { data } = await getLeaderboard(supabase, period, 1, friendIds.size, Array.from(friendIds));

    return jsonOk(data, { origin });
  });
}
