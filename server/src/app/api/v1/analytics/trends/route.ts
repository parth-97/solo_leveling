import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseQuery } from '@/lib/utils/validation';
import { scoreHistoryQuerySchema } from '@/schemas/analytics.schema';
import { getScoreHistory, periodToSinceDate } from '@/services/AnalyticsService';

export const OPTIONS = handleOptions;

const AVG_FIELDS = [
  'lifeScore',
  'disciplineScore',
  'growthScore',
  'healthScore',
  'learningScore',
  'productivityScore',
  'relationshipScore',
  'questsDone',
  'questsTotal',
  'habitsDone',
  'habitsTotal',
  'streakDays',
  'xpEarnedToday',
] as const;

/**
 * GET /api/v1/analytics/trends?period=week|month|year
 * Returns per-day trend points (scores + xpEarned) and period averages
 * for each AnalyticsScores field.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const url = new URL(request.url);
    const { period } = parseQuery(url.searchParams, scoreHistoryQuerySchema);

    const since = periodToSinceDate(period);
    const scores = (await getScoreHistory(supabase, userId, since)) as Array<Record<string, number | string>>;

    const data = scores.map((s) => ({
      date: s.scoreDate as string,
      lifeScore: s.lifeScore as number,
      disciplineScore: s.disciplineScore as number,
      growthScore: s.growthScore as number,
      healthScore: s.healthScore as number,
      learningScore: s.learningScore as number,
      productivityScore: s.productivityScore as number,
      relationshipScore: s.relationshipScore as number,
      xpEarned: s.xpEarnedToday as number,
    }));

    const averages: Record<string, number> = {};
    for (const field of AVG_FIELDS) {
      const values = scores.map((s) => Number(s[field] ?? 0));
      averages[field] = values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : 0;
    }

    return jsonOk({ period, data, averages }, { origin });
  });
}
