import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string; uid: string }> };

/** DELETE /api/v1/groups/:id/members/:uid — kick a member (owner or admin only). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id, uid } = await params;

    const { data: group, error: groupError } = await supabase.from('groups').select('id, owner_id, member_count').eq('id', id).single();
    if (groupError || !group) throw new ApiException('NOT_FOUND', 'Group not found.');

    if (uid === group.owner_id) throw new ApiException('FORBIDDEN', 'The group owner cannot be removed.');

    const { data: actor } = await supabase.from('group_members').select('role').eq('group_id', id).eq('user_id', userId).maybeSingle();
    const isOwnerOrAdmin = group.owner_id === userId || actor?.role === 'admin';
    if (!isOwnerOrAdmin) throw new ApiException('FORBIDDEN', 'Only the owner or an admin can remove members.');

    const { error, data: deleted } = await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', uid).select('id');
    const count = deleted?.length ?? 0;
    if (error) throw new ApiException('INTERNAL_ERROR', 'Failed to remove member.');
    if (!count) throw new ApiException('NOT_FOUND', 'Member not found in this group.');

    await supabase.from('groups').update({ member_count: Math.max(0, group.member_count - 1) }).eq('id', id);

    return jsonOk({ groupId: id, userId: uid, removed: true }, { origin });
  });
}
