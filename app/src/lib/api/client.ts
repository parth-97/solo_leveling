import { supabase } from '@/lib/supabase';
import type { ApiError, ApiResponse } from '@/types/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export class ApiRequestError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, string[]>;

  constructor(err: ApiError) {
    super(err.message);
    this.name = 'ApiRequestError';
    this.code = err.code;
    this.statusCode = err.statusCode;
    this.details = err.details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Query params, appended to the URL. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Pass a FormData body directly (skips JSON.stringify / Content-Type). */
  isFormData?: boolean;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Returns a valid access token, refreshing the session if needed.
 *
 * getSession() only reads from localStorage and returns stale/expired
 * tokens silently — this is what causes the 401 storm. Instead we:
 * 1. Get the session from localStorage.
 * 2. If the token expires within 60s, proactively refresh it.
 * 3. Return the (possibly refreshed) access token.
 */
async function getAccessToken(): Promise<string | undefined> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return undefined;

  // Proactively refresh if expiring within 60 seconds.
  const expiresAt = (session.expires_at ?? 0) * 1000;
  if (Date.now() >= expiresAt - 60_000) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token;
  }

  return session.access_token;
}

/**
 * Core fetch wrapper used by all API service modules.
 * - Attaches the current Supabase access token as a Bearer header.
 * - Parses `ApiResponse<T>` / `ApiError` per the shared contract.
 * - Throws `ApiRequestError` on non-2xx responses.
 * - On 401, attempts one token refresh and retries before throwing.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, isFormData } = options;

  const doRequest = async (token: string | undefined) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    return fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  };

  let accessToken = await getAccessToken();
  let response = await doRequest(accessToken);

  // On 401, force-refresh the session once and retry.
  // This handles the race where the token expired between the check above
  // and the actual request reaching the server.
  if (response.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session) {
      accessToken = refreshed.session.access_token;
      response = await doRequest(accessToken);
    }
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const errBody = json as { error?: ApiError } | ApiError | null;
    const apiError: ApiError =
      errBody && 'error' in (errBody as object)
        ? (errBody as { error: ApiError }).error
        : (errBody as ApiError) ?? {
            code: 'UNKNOWN_ERROR',
            message: response.statusText || 'Request failed',
            statusCode: response.status,
          };
    throw new ApiRequestError(apiError);
  }

  return json as T;
}

/** Convenience for endpoints returning ApiResponse<T> where only `data` is needed. */
export async function apiFetchData<T>(path: string, options?: RequestOptions): Promise<T> {
  const res = await apiFetch<ApiResponse<T>>(path, options);
  return res.data;
}
