import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';

export const OPTIONS = handleOptions;

/**
 * GET /api/v1/xp/summary — sums positive XP transactions over
 * today/this week/this month/all-time. Negative transactions
 * (penalties) are included in the sums as-is, matching "net XP earned"
 * for each window.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfToday);
    const dow = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - (dow === 0 ? 6 : dow - 1)); // Monday

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: allTx, error } = await supabase
      .from('xp_transactions')
      .select('amount, created_at')
      .eq('user_id', userId);

    if (error) throw error;

    const rows = (allTx ?? []) as Array<{ amount: number; created_at: string }>;

    const sumSince = (since: Date) =>
      rows.filter((r) => new Date(r.created_at) >= since).reduce((sum, r) => sum + r.amount, 0);

    const allTime = rows.reduce((sum, r) => sum + r.amount, 0);

    return jsonOk(
      {
        today: sumSince(startOfToday),
        week: sumSince(startOfWeek),
        month: sumSince(startOfMonth),
        allTime,
      },
      { origin }
    );
  });
}
