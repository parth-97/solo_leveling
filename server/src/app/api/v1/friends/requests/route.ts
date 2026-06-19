import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

/** GET /api/v1/friends/requests — pending friend requests where the current user is the addressee. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    const { data, error } = await supabase
      .from('friendships')
      .select('*, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url, rank, level)')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return jsonOk(toCamel(data ?? []), { origin });
  });
}
