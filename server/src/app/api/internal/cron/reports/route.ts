import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/utils/cronAuth';
import { withErrorHandling, jsonOk } from '@/lib/utils/response';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeReport, periodBounds } from '@/services/ReportService';

/**
 * POST /api/internal/cron/reports
 * Body (optional JSON): { "period": "daily" | "weekly" | "monthly" | "yearly" }
 * Defaults to "daily" if not provided.
 *
 * Pre-computes and stores a report for every user for the given period.
 * GET /reports/:period falls back to computing on-the-fly if no stored
 * report exists for the current window, so this cron is an optimization
 * for the common case (most users won't trigger generation themselves).
 *
 * Schedule:
 *  - daily: once per day (end of day)
 *  - weekly: once per week (e.g. Sunday night)
 *  - monthly: once per month (last day)
 *  - yearly: once per year
 *
 * Trigger:
 *   POST /api/internal/cron/reports
 *   Authorization: Bearer <CRON_SECRET>
 *   Content-Type: application/json
 *   { "period": "weekly" }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    requireCronAuth(request);

    let period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily';
    try {
      const body = await request.json();
      if (body?.period && ['daily', 'weekly', 'monthly', 'yearly'].includes(body.period)) {
        period = body.period;
      }
    } catch {
      // no body provided — use default
    }

    const supabase = createAdminClient();
    const { start, end } = periodBounds(period);

    const { data: profiles, error } = await supabase.from('profiles').select('id');
    if (error) throw error;

    let succeeded = 0;
    let failed = 0;

    for (const profile of profiles ?? []) {
      try {
        const report = await computeReport(supabase, profile.id, period);
        await supabase.from('reports').upsert(
          { user_id: profile.id, period, period_start: start, period_end: end, data: report },
          { onConflict: 'user_id,period,period_start' }
        );
        succeeded++;
      } catch {
        failed++;
      }
    }

    return jsonOk({ period, periodStart: start, succeeded, failed, total: (profiles ?? []).length }, { origin });
  });
}
