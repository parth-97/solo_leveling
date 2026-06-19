import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/achievements/:id — single achievement with unlocked status for the current user. */
export async function GET(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: achievement, error } = await supabase.from('achievements').select('*').eq('id', id).single();
    if (error || !achievement) throw new ApiException('NOT_FOUND', 'Achievement not found.');

    const { data: unlock } = await supabase
      .from('user_achievements')
      .select('unlocked_at')
      .eq('user_id', userId)
      .eq('achievement_id', id)
      .maybeSingle();

    if (achievement.is_secret && !unlock) {
      throw new ApiException('NOT_FOUND', 'Achievement not found.');
    }

    return jsonOk(
      { ...toCamel<Record<string, unknown>>(achievement), unlocked: !!unlock, unlockedAt: unlock?.unlocked_at ?? null },
      { origin }
    );
  });
}
