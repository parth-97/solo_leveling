import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

/** GET /api/v1/xp/transactions — paginated XP ledger, newest first. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { page, limit, offset } = parsePagination(request);

    const { data, error, count } = await supabase
      .from('xp_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return jsonPaginated(toCamel(data ?? []) as unknown[], paginationMeta(page, limit, count ?? 0), { origin });
  });
}
