import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonPaginated, jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { parseBody } from '@/lib/utils/validation';
import { parsePagination, paginationMeta } from '@/lib/utils/pagination';
import { createGroupSchema } from '@/schemas/community.schema';
import { GROUP_SELECT, transformGroup } from '@/services/GroupService';

export const OPTIONS = handleOptions;

/** GET /api/v1/groups — public groups + groups the user owns or belongs to (per RLS). */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { supabase } = await requireAuth(request);
    const { page, limit, offset } = parsePagination(request);

    const { data, error, count } = await supabase
      .from('groups')
      .select(GROUP_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const groups = await Promise.all((data ?? []).map((row) => transformGroup(supabase, row)));
    return jsonPaginated(groups, paginationMeta(page, limit, count ?? 0), { origin });
  });
}

/** POST /api/v1/groups — create a group (creator becomes owner + first member). */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const input = await parseBody(request, createGroupSchema);

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        owner_id: userId,
        name: input.name,
        description: input.description ?? null,
        is_public: input.isPublic ?? true,
        max_members: input.maxMembers ?? 50,
        member_count: 1,
      })
      .select(GROUP_SELECT)
      .single();

    if (error || !group) throw new ApiException('INTERNAL_ERROR', 'Failed to create group.');

    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'owner',
    });

    if (memberError) throw new ApiException('INTERNAL_ERROR', 'Group created but failed to add owner as member.');

    return jsonOk(await transformGroup(supabase, group, true), { origin, status: 201 });
  });
}
