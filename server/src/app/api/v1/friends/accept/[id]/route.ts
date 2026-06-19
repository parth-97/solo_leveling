import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';
import { sendNotification } from '@/services/NotificationService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** POST /api/v1/friends/accept/:id — accept a pending friend request (id = friendship id). */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: friendship, error: fetchError } = await supabase.from('friendships').select('*').eq('id', id).single();
    if (fetchError || !friendship) throw new ApiException('NOT_FOUND', 'Friend request not found.');
    if (friendship.addressee_id !== userId) throw new ApiException('FORBIDDEN', 'Only the recipient can accept this request.');
    if (friendship.status !== 'pending') throw new ApiException('CONFLICT', 'This request is no longer pending.');

    const { data: updated, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !updated) throw new ApiException('INTERNAL_ERROR', 'Failed to accept friend request.');

    await sendNotification(supabase, friendship.requester_id, {
      type: 'social',
      title: 'Friend Request Accepted',
      message: 'Your friend request was accepted!',
      data: { friendshipId: id, addresseeId: userId },
    });

    return jsonOk(toCamel(updated), { origin });
  });
}
