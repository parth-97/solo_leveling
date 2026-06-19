import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';
import { createAdminClient } from '@/lib/supabase/admin';

export const OPTIONS = handleOptions;

/**
 * GET /api/v1/profile/:username — public profile lookup.
 *
 * Uses the admin client (bypasses RLS) so that username searches for
 * friend requests work regardless of the target's `is_public` flag.
 * The caller must still be authenticated (requireAuth enforces this).
 *
 * Searches by `username` first (exact match), then falls back to a
 * case-insensitive `display_name` match. This handles the common case
 * where users type the display name they see on the leaderboard (e.g.
 * "Jin woo") rather than the auto-generated username ("jin_woo").
 *
 * Sensitive fields (email, notification prefs, onboarding step) are
 * stripped from the response per GetPublicProfileResponse.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    // Caller must be authenticated — admin client skips RLS, not auth.
    await requireAuth(request);

    const { username } = await params;
    const admin = createAdminClient();

    // 1. Try exact username match (case-insensitive).
    let { data: profile } = await admin
      .from('profiles')
      .select('*')
      .ilike('username', username.trim())
      .maybeSingle();

    // 2. Fall back to display_name match (case-insensitive) so users can
    //    type the name they see on the leaderboard, e.g. "Jin woo".
    if (!profile) {
      const { data: byDisplay } = await admin
        .from('profiles')
        .select('*')
        .ilike('display_name', username.trim())
        .maybeSingle();
      profile = byDisplay ?? null;
    }

    if (!profile) throw new ApiException('NOT_FOUND', 'Profile not found.');

    const camel = toCamel<Record<string, unknown>>(profile);
    // Strip sensitive fields before returning.
    delete camel.email;
    delete camel.emailNotifications;
    delete camel.pushNotifications;
    delete camel.onboardingStep;

    return jsonOk(camel, { origin });
  });
}
