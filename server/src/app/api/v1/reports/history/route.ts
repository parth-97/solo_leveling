import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';

export const OPTIONS = handleOptions;

/** GET /api/v1/reports/history — paginated list of past reports (period, dates, summary only). */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { page, limit, offset } = parsePagination(request);

    const { data, error, count } = await supabase
      .from('reports')
      .select('period, period_start, period_end, data', { count: 'exact' })
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const results = (data ?? []).map((row: { period: string; period_start: string; period_end: string; data: { summary: unknown } }) => ({
      period: row.period,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      summary: row.data?.summary ?? null,
    }));

    return jsonPaginated(results, paginationMeta(page, limit, count ?? 0), { origin });
  });
}
