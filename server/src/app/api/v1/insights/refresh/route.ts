import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';
import { generateInsights } from '@/services/InsightService';

export const OPTIONS = handleOptions;

/**
 * POST /api/v1/insights/refresh — dismisses all current insights and
 * generates a fresh batch immediately (user-triggered, vs. the
 * once-per-day lazy generation in GET /insights).
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    await supabase.from('ai_insights').update({ dismissed: true }).eq('user_id', userId).eq('dismissed', false);

    const generated = await generateInsights(supabase, userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error } = await supabase
      .from('ai_insights')
      .insert(generated.map((i) => ({ user_id: userId, type: i.type, title: i.title, message: i.message, action: i.action, expires_at: expiresAt })))
      .select('*');

    if (error) throw error;

    return jsonOk(toCamel(inserted ?? []), { origin });
  });
}
