import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

const PROFILE_SUMMARY = 'id, username, display_name, avatar_url, rank, level';

/**
 * GET /api/v1/feed — activity from the current user and their accepted
 * friends, newest first (the personalized feed shown on the Community
 * page's "Activity Feed" tab).
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { page, limit, offset } = parsePagination(request);

    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    const userIds = new Set<string>([userId]);
    for (const f of (friendships ?? []) as Array<{ requester_id: string; addressee_id: string }>) {
      userIds.add(f.requester_id === userId ? f.addressee_id : f.requester_id);
    }

    const { data, error, count } = await supabase
      .from('activity_feed')
      .select(`*, user:profiles!activity_feed_user_id_fkey(${PROFILE_SUMMARY})`, { count: 'exact' })
      .in('user_id', Array.from(userIds))
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return jsonPaginated(toCamel(data ?? []) as unknown[], paginationMeta(page, limit, count ?? 0), { origin });
  });
}
