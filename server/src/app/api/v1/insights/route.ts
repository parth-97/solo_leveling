import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';
import { generateInsights } from '@/services/InsightService';

export const OPTIONS = handleOptions;

/**
 * GET /api/v1/insights — active (non-dismissed, non-expired) AI insights
 * for the current user. Generates a fresh batch on first request of the
 * day if none exist yet (insights expire after 24h, see expires_at).
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    const nowIso = new Date().toISOString();

    const { data: existing, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('dismissed', false)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (existing && existing.length > 0) {
      return jsonOk(toCamel(existing), { origin });
    }

    const generated = await generateInsights(supabase, userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from('ai_insights')
      .insert(generated.map((i) => ({ user_id: userId, type: i.type, title: i.title, message: i.message, action: i.action, expires_at: expiresAt })))
      .select('*');

    if (insertError) throw insertError;

    return jsonOk(toCamel(inserted ?? []), { origin });
  });
}
