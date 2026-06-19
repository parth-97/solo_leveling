import { NextResponse } from 'next/server';
import { corsHeaders } from './cors';

/**
 * Known error codes used across routes. Mirrors the informal contract
 * implied by ApiError.code in the shared frontend types.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  BAD_REQUEST: 400,
};

/** Success response: `{ data, meta? }` — matches ApiResponse<T>. */
export function jsonOk<T>(
  data: T,
  init?: { status?: number; meta?: Record<string, unknown>; origin?: string | null }
) {
  const body: Record<string, unknown> = { data };
  if (init?.meta) body.meta = init.meta;
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: corsHeaders(init?.origin ?? null),
  });
}

/** Paginated success response — matches PaginatedResponse<T>. */
export function jsonPaginated<T>(
  data: T[],
  meta: { total: number; page: number; limit: number; hasMore: boolean; nextCursor?: string },
  init?: { origin?: string | null }
) {
  return NextResponse.json({ data, meta }, { status: 200, headers: corsHeaders(init?.origin ?? null) });
}

/** Error response: `{ error: ApiError }`. */
export function jsonError(
  code: ApiErrorCode,
  message: string,
  init?: { details?: Record<string, string[]>; origin?: string | null; status?: number }
) {
  const statusCode = init?.status ?? STATUS_BY_CODE[code];
  return NextResponse.json(
    {
      error: {
        code,
        message,
        statusCode,
        ...(init?.details ? { details: init.details } : {}),
      },
    },
    { status: statusCode, headers: corsHeaders(init?.origin ?? null) }
  );
}

/**
 * Wraps a route handler body, converting thrown `ApiException`s (and
 * unexpected errors) into proper error responses with CORS headers.
 */
export class ApiException extends Error {
  code: ApiErrorCode;
  details?: Record<string, string[]>;
  status?: number;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, string[]>, status?: number) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function withErrorHandling(
  origin: string | null,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof ApiException) {
      return jsonError(err.code, err.message, { details: err.details, origin, status: err.status });
    }
    // eslint-disable-next-line no-console
    console.error('Unhandled API error:', err);
    return jsonError('INTERNAL_ERROR', 'An unexpected error occurred.', { origin });
  }
}
