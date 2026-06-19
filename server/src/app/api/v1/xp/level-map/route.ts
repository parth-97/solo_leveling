import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

/**
 * GET /api/v1/xp/level-map — the full level -> {xpRequired, rank, title,
 * xpMultiplier} table. Static-ish (changes only via migration), so the
 * frontend hook sets staleTime: Infinity.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { supabase } = await requireAuth(request);

    const { data, error } = await supabase.from('level_config').select('*').order('level', { ascending: true });
    if (error) throw error;

    return jsonOk(toCamel(data ?? []), { origin });
  });
}
