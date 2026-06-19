import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** POST /api/v1/groups/:id/leave — leave a group. Owners cannot leave (must delete the group instead). */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: group, error: groupError } = await supabase.from('groups').select('id, owner_id, member_count').eq('id', id).single();
    if (groupError || !group) throw new ApiException('NOT_FOUND', 'Group not found.');
    if (group.owner_id === userId) throw new ApiException('CONFLICT', 'Group owners cannot leave — delete the group instead.');

    const { error, data: deleted } = await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', userId).select('id');
    const count = deleted?.length ?? 0;
    if (error) throw new ApiException('INTERNAL_ERROR', 'Failed to leave group.');
    if (!count) throw new ApiException('NOT_FOUND', 'You are not a member of this group.');

    await supabase.from('groups').update({ member_count: Math.max(0, group.member_count - 1) }).eq('id', id);

    return jsonOk({ id, left: true }, { origin });
  });
}
