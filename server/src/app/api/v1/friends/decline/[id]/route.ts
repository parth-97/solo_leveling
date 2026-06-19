import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** POST /api/v1/friends/decline/:id — decline a pending friend request (deletes the row). */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: friendship, error: fetchError } = await supabase.from('friendships').select('*').eq('id', id).single();
    if (fetchError || !friendship) throw new ApiException('NOT_FOUND', 'Friend request not found.');
    if (friendship.addressee_id !== userId) throw new ApiException('FORBIDDEN', 'Only the recipient can decline this request.');
    if (friendship.status !== 'pending') throw new ApiException('CONFLICT', 'This request is no longer pending.');

    const { error } = await supabase.from('friendships').delete().eq('id', id);
    if (error) throw new ApiException('INTERNAL_ERROR', 'Failed to decline friend request.');

    return jsonOk({ id, declined: true }, { origin });
  });
}
