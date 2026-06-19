import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

/**
 * Creates a Supabase client scoped to the current request's user.
 *
 * Two auth modes are supported by the frontend's `apiFetch` (see
 * src/lib/api/client.ts in the Vite app):
 *  1. Cookie-based session (if the API is ever served same-site).
 *  2. `Authorization: Bearer <access_token>` header (current setup,
 *     since the frontend and this API run on different origins).
 *
 * This client respects Row Level Security — all queries are executed
 * as the authenticated user, so `auth.uid()` resolves correctly inside
 * RLS policies and RPC functions.
 */
export async function createServerSupabaseClient(request?: NextRequest) {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component / route without write access —
          // safe to ignore since session refresh isn't required here.
        }
      },
    },
  });

  // If the request carries a Bearer token, use it to set the session
  // for this request explicitly (covers the cross-origin Vite case).
  const authHeader = request?.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.slice('Bearer '.length);
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    } as never).catch(() => {
      // setSession with no refresh token may throw on refresh attempts;
      // getUser() below still validates the access token directly.
    });
  }

  return client;
}

/**
 * Resolves the authenticated user for the current request, or null.
 * Prefers the Authorization header (cross-origin case) and falls back
 * to cookies.
 */
export async function getAuthUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.slice('Bearer '.length);
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    });
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) return { user: null, accessToken: null };
    return { user: data.user, accessToken };
  }

  const supabase = await createServerSupabaseClient(request);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, accessToken: null };
  return { user: data.user, accessToken: null };
}

/**
 * Returns a Supabase client authenticated as the current user via the
 * Bearer token (preferred for cross-origin requests from the Vite app),
 * falling back to the cookie-based server client.
 */
export async function getRequestSupabaseClient(request: NextRequest, accessToken: string | null) {
  if (accessToken) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    });
  }
  return createServerSupabaseClient(request);
}
