import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { updateGroupSchema } from '@/schemas/community.schema';
import { GROUP_SELECT, transformGroup } from '@/services/GroupService';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/groups/:id — includes members list. */
export async function GET(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { supabase } = await requireAuth(request);
    const { id } = await params;

    const { data, error } = await supabase.from('groups').select(GROUP_SELECT).eq('id', id).single();
    if (error || !data) throw new ApiException('NOT_FOUND', 'Group not found.');

    return jsonOk(await transformGroup(supabase, data, true), { origin });
  });
}

/** PATCH /api/v1/groups/:id — update group settings (owner only, enforced by RLS). */
export async function PATCH(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;
    const input = await parseBody(request, updateGroupSchema);

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.isPublic !== undefined) updates.is_public = input.isPublic;
    if (input.maxMembers !== undefined) updates.max_members = input.maxMembers;

    if (Object.keys(updates).length === 0) {
      throw new ApiException('VALIDATION_ERROR', 'No fields provided to update.');
    }

    const { error: updateError, data: updatedRows } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', id)
      .eq('owner_id', userId)
      .select('id');
    const count = updatedRows?.length ?? 0;

    if (updateError) throw new ApiException('INTERNAL_ERROR', 'Failed to update group.');
    if (!count) throw new ApiException('FORBIDDEN', 'Only the group owner can update this group.');

    const { data, error } = await supabase.from('groups').select(GROUP_SELECT).eq('id', id).single();
    if (error || !data) throw new ApiException('INTERNAL_ERROR', 'Group updated but failed to load.');

    return jsonOk(await transformGroup(supabase, data, true), { origin });
  });
}

/** DELETE /api/v1/groups/:id — delete a group (owner only). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { error, data: deletedRows } = await supabase.from('groups').delete().eq('id', id).eq('owner_id', userId).select('id');
    const count = deletedRows?.length ?? 0;

    if (error) throw new ApiException('INTERNAL_ERROR', 'Failed to delete group.');
    if (!count) throw new ApiException('FORBIDDEN', 'Only the group owner can delete this group.');

    return jsonOk({ id }, { origin });
  });
}
