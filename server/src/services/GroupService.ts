import type { SupabaseClient } from '@supabase/supabase-js';
import { toCamel } from '@/lib/utils/case';

const PROFILE_SUMMARY = 'id, username, display_name, avatar_url, rank, level';

export const GROUP_SELECT = `*, owner:profiles!groups_owner_id_fkey(${PROFILE_SUMMARY})`;

/** Transforms a raw group row, optionally attaching members. */
export async function transformGroup(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  includeMembers = false
): Promise<Record<string, unknown>> {
  const camel = toCamel<Record<string, unknown>>(row);

  if (includeMembers) {
    const { data: members } = await supabase
      .from('group_members')
      .select(`*, profile:profiles!group_members_user_id_fkey(${PROFILE_SUMMARY})`)
      .eq('group_id', row.id as string)
      .order('joined_at', { ascending: true });

    camel.members = toCamel(members ?? []);
  }

  return camel;
}
