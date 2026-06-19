import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { reportPeriodSchema } from '@/schemas/analytics.schema';
import { computeReport, periodBounds } from '@/services/ReportService';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ period: string }> };

/**
 * GET /api/v1/reports/:period — returns the latest stored report for
 * the period if one exists for the current period window; otherwise
 * computes and stores a fresh one (lazy generation), matching the
 * behaviour cron (/api/internal/cron/reports) would otherwise pre-populate.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { period: rawPeriod } = await params;

    const parsed = reportPeriodSchema.safeParse(rawPeriod);
    if (!parsed.success) throw new ApiException('VALIDATION_ERROR', 'Invalid period. Use daily, weekly, monthly, or yearly.');
    const period = parsed.data;

    const { start, end } = periodBounds(period);

    const { data: existing } = await supabase
      .from('reports')
      .select('data')
      .eq('user_id', userId)
      .eq('period', period)
      .eq('period_start', start)
      .maybeSingle();

    if (existing) {
      return jsonOk(existing.data, { origin });
    }

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

    return jsonOk(toCamel(report), { origin });
  });
}
