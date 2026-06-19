import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { generateReportSchema } from '@/schemas/analytics.schema';
import { computeReport, periodBounds } from '@/services/ReportService';

export const OPTIONS = handleOptions;

/** POST /api/v1/reports/generate — force (re)computation of a report for a period. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { period } = await parseBody(request, generateReportSchema);

    const { start, end } = periodBounds(period);
    const report = await computeReport(supabase, userId, period);

    await supabase.from('reports').upsert(
      {
        user_id: userId,
        period,
        period_start: start,
        period_end: end,
        data: report,
      },
      { onConflict: 'user_id,period,period_start' }
    );

    return jsonOk(report, { origin });
  });
}
