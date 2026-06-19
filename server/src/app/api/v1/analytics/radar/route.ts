import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { getOrComputeTodayScores } from '@/services/AnalyticsService';

export const OPTIONS = handleOptions;

const AXES: Array<{ subject: string; field: string }> = [
  { subject: 'Life', field: 'lifeScore' },
  { subject: 'Discipline', field: 'disciplineScore' },
  { subject: 'Growth', field: 'growthScore' },
  { subject: 'Health', field: 'healthScore' },
  { subject: 'Learning', field: 'learningScore' },
  { subject: 'Productivity', field: 'productivityScore' },
  { subject: 'Relationships', field: 'relationshipScore' },
];

/** GET /api/v1/analytics/radar — today's scores reshaped into the 7-axis RadarChartData[]. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const scores = await getOrComputeTodayScores(supabase, userId) as Record<string, number>;

    const radar = AXES.map(({ subject, field }) => ({
      subject,
      score: Math.round(scores[field] ?? 0),
      fullMark: 100 as const,
    }));

    return jsonOk(radar, { origin });
  });
}
