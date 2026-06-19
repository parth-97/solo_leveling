import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseQuery } from '@/lib/utils/validation';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { listNotificationsQuerySchema } from '@/schemas/notification.schema';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

/** GET /api/v1/notifications — paginated, newest first, optionally filtered by read status. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const query = parseQuery(url.searchParams, listNotificationsQuerySchema);
    const { page, limit, offset } = parsePagination(request);

    let q = supabase.from('notifications').select('*', { count: 'exact' }).eq('user_id', userId);
    if (query.read !== undefined) q = q.eq('read', query.read === 'true');

    const { data, error, count } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;

    return jsonPaginated(toCamel(data ?? []) as unknown[], paginationMeta(page, limit, count ?? 0), { origin });
  });
}
