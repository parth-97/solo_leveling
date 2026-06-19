import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { sendFriendRequestSchema } from '@/schemas/community.schema';
import { toCamel } from '@/lib/utils/case';
import { sendNotification } from '@/services/NotificationService';

export const OPTIONS = handleOptions;

/** POST /api/v1/friends/request — send a friend request. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { addresseeId } = await parseBody(request, sendFriendRequestSchema);

    if (addresseeId === userId) {
      throw new ApiException('VALIDATION_ERROR', 'You cannot send a friend request to yourself.');
    }

    // Check for an existing friendship in either direction
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${userId})`
      )
      .maybeSingle();

    if (existing) {
      throw new ApiException('CONFLICT', `A friendship already exists with status "${existing.status}".`);
    }

    const { data: friendship, error } = await supabase
      .from('friendships')
      .insert({ requester_id: userId, addressee_id: addresseeId, status: 'pending' })
      .select('*')
      .single();

    if (error || !friendship) throw new ApiException('INTERNAL_ERROR', 'Failed to send friend request.');

    await sendNotification(supabase, addresseeId, {
      type: 'social',
      title: 'New Friend Request',
      message: 'You have a new friend request.',
      data: { friendshipId: friendship.id, requesterId: userId },
    });

    return jsonOk(toCamel(friendship), { origin, status: 201 });
  });
}
