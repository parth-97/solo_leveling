import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseQuery } from '@/lib/utils/validation';
import { scoreHistoryQuerySchema } from '@/schemas/analytics.schema';
import { getScoreHistory, periodToSinceDate } from '@/services/AnalyticsService';

export const OPTIONS = handleOptions;

/** GET /api/v1/analytics/scores/history?period=week|month|year */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const { period } = parseQuery(url.searchParams, scoreHistoryQuerySchema);

    const since = periodToSinceDate(period);
    const scores = await getScoreHistory(supabase, userId, since);

    return jsonOk(scores, { origin });
  });
}
