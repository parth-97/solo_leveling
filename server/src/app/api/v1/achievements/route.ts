import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

/**
 * GET /api/v1/achievements — all achievement definitions, with
 * `unlocked`/`unlockedAt` joined in for the current user. Secret
 * achievements (`is_secret = true`) that the user hasn't unlocked yet
 * are excluded entirely (no spoilers), matching the spirit of
 * `is_secret` in files/01_schema_and_tables.sql.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    const { data: achievements, error } = await supabase
      .from('achievements')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const { data: unlocked } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId);

    const unlockedMap = new Map((unlocked ?? []).map((u: { achievement_id: string; unlocked_at: string }) => [u.achievement_id, u.unlocked_at]));

    const result = (achievements ?? [])
      .filter((a: { id: string; is_secret: boolean }) => !a.is_secret || unlockedMap.has(a.id))
      .map((a: { id: string; [key: string]: unknown }) => ({
        ...toCamel<Record<string, unknown>>(a),
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) ?? null,
      }));

    return jsonOk(result, { origin });
  });
}
