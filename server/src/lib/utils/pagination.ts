import type { NextRequest } from 'next/server';

export interface ParsedPagination {
  page: number;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Parses `page`/`limit` query params with sane defaults and bounds. */
export function parsePagination(request: NextRequest): ParsedPagination {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/** Builds the `meta` object for a PaginatedResponse given a total count. */
export function paginationMeta(page: number, limit: number, total: number) {
  return {
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
