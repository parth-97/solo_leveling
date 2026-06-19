import type { SupabaseClient } from '@supabase/supabase-js';
import { toCamel } from '@/lib/utils/case';

const PROFILE_SUMMARY = 'id, username, display_name, avatar_url, rank, level';

export const CHALLENGE_SELECT = `*, creator:profiles!challenges_creator_id_fkey(${PROFILE_SUMMARY})`;

/** Transforms a raw challenge row, attaching userParticipant if the user has joined. */
export async function transformChallenge(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>> {
  const camel = toCamel<Record<string, unknown>>(row);

  const { data: participant } = await supabase
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', row.id as string)
    .eq('user_id', userId)
    .maybeSingle();

  if (participant) {
    camel.userParticipant = toCamel(participant);
  }

  return camel;
}
