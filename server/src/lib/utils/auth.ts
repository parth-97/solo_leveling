import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthUser, getRequestSupabaseClient } from '@/lib/supabase/server';
import { ApiException } from '@/lib/utils/response';

export interface AuthContext {
  userId: string;
  /** Request-scoped client — queries through this respect RLS as the user. */
  supabase: SupabaseClient;
}

/**
 * Resolves the authenticated user for this request and returns an
 * RLS-scoped Supabase client. Throws `ApiException('UNAUTHORIZED', ...)`
 * if there's no valid session — route handlers should let this propagate
 * to `withErrorHandling`.
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const { user, accessToken } = await getAuthUser(request);
  if (!user) {
    throw new ApiException('UNAUTHORIZED', 'You must be signed in to access this resource.');
  }
  const supabase = await getRequestSupabaseClient(request, accessToken);
  return { userId: user.id, supabase };
}
