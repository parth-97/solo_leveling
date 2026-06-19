import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseQuery } from '@/lib/utils/validation';
import { leaderboardQuerySchema } from '@/schemas/community.schema';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { getLeaderboard } from '@/services/LeaderboardService';

export const OPTIONS = handleOptions;

/** GET /api/v1/leaderboard?period=daily|weekly|monthly|yearly — global leaderboard. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const { period } = parseQuery(url.searchParams, leaderboardQuerySchema);
    const { page, limit } = parsePagination(request);

    const { data, total } = await getLeaderboard(supabase, period, page, limit);

    return jsonPaginated(data, paginationMeta(page, limit, total), { origin });
  });
}
