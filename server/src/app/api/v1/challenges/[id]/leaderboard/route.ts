import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

const PROFILE_SUMMARY = 'id, username, display_name, avatar_url, rank, level';

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/challenges/:id/leaderboard — participants ranked by progress (desc), then completion time. */
export async function GET(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { supabase } = await requireAuth(request);
    const { id } = await params;
    const { page, limit, offset } = parsePagination(request);

    const { data, error, count } = await supabase
      .from('challenge_participants')
      .select(`*, profile:profiles!challenge_participants_user_id_fkey(${PROFILE_SUMMARY})`, { count: 'exact' })
      .eq('challenge_id', id)
      .order('progress', { ascending: false })
      .order('completed_at', { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Assign rank_position based on sorted order within this page.
    const result = (data ?? []).map((row: Record<string, unknown>, idx: number) => ({
      ...toCamel<Record<string, unknown>>(row),
      rankPosition: offset + idx + 1,
    }));

    return jsonPaginated(result, paginationMeta(page, limit, count ?? 0), { origin });
  });
}
