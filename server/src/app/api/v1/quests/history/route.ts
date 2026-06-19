import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseQuery } from '@/lib/utils/validation';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { questHistoryQuerySchema } from '@/schemas/quest.schema';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

const QUEST_SELECT = `*, category:categories(id, name, slug, icon_name, color, description)`;

/** GET /api/v1/quests/history — paginated quest history, optionally filtered by completion. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const query = parseQuery(url.searchParams, questHistoryQuerySchema);
    const { page, limit, offset } = parsePagination(request);

    let q = supabase.from('daily_quests').select(QUEST_SELECT, { count: 'exact' }).eq('user_id', userId);
    if (query.completed !== undefined) q = q.eq('completed', query.completed === 'true');

    const { data, error, count } = await q.order('quest_date', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;

    return jsonPaginated(toCamel(data ?? []) as unknown[], paginationMeta(page, limit, count ?? 0), { origin });
  });
}
