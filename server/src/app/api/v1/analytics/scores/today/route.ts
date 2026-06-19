import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { getOrComputeTodayScores } from '@/services/AnalyticsService';

export const OPTIONS = handleOptions;

/** GET /api/v1/analytics/scores/today — today's 7-axis AnalyticsScores snapshot. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const scores = await getOrComputeTodayScores(supabase, userId);
    return jsonOk(scores, { origin });
  });
}
