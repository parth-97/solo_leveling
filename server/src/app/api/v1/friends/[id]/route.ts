import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/v1/friends/:id — remove an accepted friendship (id = friendship id). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: friendship, error: fetchError } = await supabase.from('friendships').select('*').eq('id', id).single();
    if (fetchError || !friendship) throw new ApiException('NOT_FOUND', 'Friendship not found.');
    if (friendship.requester_id !== userId && friendship.addressee_id !== userId) {
      throw new ApiException('FORBIDDEN', 'You are not part of this friendship.');
    }

    const { error } = await supabase.from('friendships').delete().eq('id', id);
    if (error) throw new ApiException('INTERNAL_ERROR', 'Failed to remove friend.');

    return jsonOk({ id, removed: true }, { origin });
  });
}
