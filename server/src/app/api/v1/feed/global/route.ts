import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

const PROFILE_SUMMARY = 'id, username, display_name, avatar_url, rank, level';

/**
 * GET /api/v1/feed/global — all public activity feed entries across
 * all users, newest first. RLS (`activity_feed_select_public`) ensures
 * only `is_public = true` rows (or the caller's own) are visible.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { supabase } = await requireAuth(request);
    const { page, limit, offset } = parsePagination(request);

    const { data, error, count } = await supabase
      .from('activity_feed')
      .select(`*, user:profiles!activity_feed_user_id_fkey(${PROFILE_SUMMARY})`, { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return jsonPaginated(toCamel(data ?? []) as unknown[], paginationMeta(page, limit, count ?? 0), { origin });
  });
}
