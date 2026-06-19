import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

const PROFILE_SUMMARY = 'id, username, display_name, avatar_url, rank, level, current_streak, last_active_date';

/**
 * GET /api/v1/friends — accepted friendships, returned as FriendProfile[]
 * (ProfileSummary + friendshipId + onlineStatus + lastActiveAt).
 *
 * onlineStatus is derived heuristically from `last_active_date`/profile
 * activity since no presence/realtime system is part of this schema:
 *  - 'online'  if last_active_date is today
 *  - 'away'    if within the last 3 days
 *  - 'offline' otherwise
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    const { data, error } = await supabase
      .from('friendships')
      .select(
        `id, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(${PROFILE_SUMMARY}), addressee:profiles!friendships_addressee_id_fkey(${PROFILE_SUMMARY})`
      )
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoIso = threeDaysAgo.toISOString().slice(0, 10);

    const result = (data ?? []).map((row: Record<string, unknown>) => {
      const isRequester = row.requester_id === userId;
      const friendProfile = (isRequester ? row.addressee : row.requester) as Record<string, unknown>;
      const lastActiveDate = friendProfile.last_active_date as string | null;

      let onlineStatus: 'online' | 'away' | 'offline' = 'offline';
      if (lastActiveDate === today) onlineStatus = 'online';
      else if (lastActiveDate && lastActiveDate >= threeDaysAgoIso) onlineStatus = 'away';

      const camel = toCamel<Record<string, unknown>>(friendProfile);
      delete camel.lastActiveDate;
      delete camel.currentStreak;

      return {
        ...camel,
        friendshipId: row.id,
        onlineStatus,
        lastActiveAt: lastActiveDate,
      };
    });

    return jsonOk(result, { origin });
  });
}
