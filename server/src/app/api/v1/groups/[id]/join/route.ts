import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { GROUP_SELECT, transformGroup } from '@/services/GroupService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** POST /api/v1/groups/:id/join — join a public group. */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data: group, error: groupError } = await supabase.from('groups').select('id, is_public, max_members, member_count').eq('id', id).single();
    if (groupError || !group) throw new ApiException('NOT_FOUND', 'Group not found.');
    if (!group.is_public) throw new ApiException('FORBIDDEN', 'This group is private.');
    if (group.member_count >= group.max_members) throw new ApiException('CONFLICT', 'This group is full.');

    const { data: existing } = await supabase.from('group_members').select('id').eq('group_id', id).eq('user_id', userId).maybeSingle();
    if (existing) throw new ApiException('CONFLICT', 'You are already a member of this group.');

    const { error: insertError } = await supabase.from('group_members').insert({ group_id: id, user_id: userId, role: 'member' });
    if (insertError) throw new ApiException('INTERNAL_ERROR', 'Failed to join group.');

    await supabase.from('groups').update({ member_count: group.member_count + 1 }).eq('id', id);

    const { data: updated, error } = await supabase.from('groups').select(GROUP_SELECT).eq('id', id).single();
    if (error || !updated) throw new ApiException('INTERNAL_ERROR', 'Joined group but failed to load.');

    return jsonOk(await transformGroup(supabase, updated, true), { origin });
  });
}
