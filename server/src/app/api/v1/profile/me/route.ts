import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { toCamel, toSnakeShallow } from '@/lib/utils/case';
import { updateProfileSchema } from '@/schemas/profile.schema';
import { getOrComputeTodayScores } from '@/services/AnalyticsService';

export const OPTIONS = handleOptions;

interface TodayScores {
  lifeScore:         number;
  disciplineScore:   number;
  growthScore:       number;
  healthScore:       number;
  learningScore:     number;
  productivityScore: number;
  relationshipScore: number;
  xpEarnedToday:     number; // ALL XP sources today (quests + habits + goals etc.)
}

const ZERO_SCORES: TodayScores = {
  lifeScore: 0,
  disciplineScore: 0,
  growthScore: 0,
  healthScore: 0,
  learningScore: 0,
  productivityScore: 0,
  relationshipScore: 0,
  xpEarnedToday: 0,
};

/** Fetches today's analytics scores. Falls back to zeros for new users. */
async function fetchScores(
  supabase: Parameters<typeof getOrComputeTodayScores>[0],
  userId: string,
): Promise<TodayScores> {
  try {
    const raw = await getOrComputeTodayScores(supabase, userId) as Record<string, unknown>;
    return {
      lifeScore:         Number(raw.lifeScore)         || 0,
      disciplineScore:   Number(raw.disciplineScore)   || 0,
      growthScore:       Number(raw.growthScore)       || 0,
      healthScore:       Number(raw.healthScore)       || 0,
      learningScore:     Number(raw.learningScore)     || 0,
      productivityScore: Number(raw.productivityScore) || 0,
      relationshipScore: Number(raw.relationshipScore) || 0,
      xpEarnedToday:     Number(raw.xpEarnedToday)     || 0,
    };
  } catch {
    return ZERO_SCORES;
  }
}

/**
 * Fetches the absolute XP threshold for the next level from level_config.
 *
 * The DB column profiles.xp_to_next_level stores REMAINING xp (cap minus
 * current xp), but the frontend Profile type expects the absolute cap
 * (i.e. the total XP required to reach the next level). We query
 * level_config directly to get the right value.
 */
async function fetchXpCap(
  supabase: Parameters<typeof getOrComputeTodayScores>[0],
  level: number,
): Promise<number> {
  const { data } = await supabase
    .from('level_config')
    .select('xp_required')
    .eq('level', level + 1)
    .single();
  return (data as { xp_required: number } | null)?.xp_required ?? 999_999_999;
}

/** GET /api/v1/profile/me — fetch the current user's full profile. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !profile) throw new ApiException('NOT_FOUND', 'Profile not found.');

    const { data: userData } = await supabase.auth.getUser();

    const [scores, xpToNextLevel] = await Promise.all([
      fetchScores(supabase, userId),
      fetchXpCap(supabase, (profile as { level: number }).level),
    ]);

    const profileCamel = toCamel(profile) as Record<string, unknown>;
    return jsonOk(
      { ...profileCamel, email: userData.user?.email ?? '', xpToNextLevel, ...scores },
      { origin }
    );
  });
}

/** PATCH /api/v1/profile/me — update profile fields. */
export async function PATCH(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const input = await parseBody(request, updateProfileSchema);

    const updates = toSnakeShallow(input as unknown as Record<string, unknown>);
    if (Object.keys(updates).length === 0) {
      throw new ApiException('VALIDATION_ERROR', 'No fields provided to update.');
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single();

    if (error || !profile) throw new ApiException('INTERNAL_ERROR', 'Failed to update profile.');

    const { data: userData } = await supabase.auth.getUser();

    const [scores, xpToNextLevel] = await Promise.all([
      fetchScores(supabase, userId),
      fetchXpCap(supabase, (profile as { level: number }).level),
    ]);

    const profileCamel = toCamel(profile) as Record<string, unknown>;
    return jsonOk(
      { ...profileCamel, email: userData.user?.email ?? '', xpToNextLevel, ...scores },
      { origin }
    );
  });
}
