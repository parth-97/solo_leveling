import type { NextRequest } from 'next/server';
import { ApiException } from '@/lib/utils/response';

/**
 * Verifies the `Authorization: Bearer <CRON_SECRET>` header on internal
 * cron endpoints. Throws UNAUTHORIZED (mapped to 401) if missing/invalid.
 */
export function requireCronAuth(request: NextRequest): void {
  const expected = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');

  if (!expected) {
    throw new ApiException('INTERNAL_ERROR', 'CRON_SECRET is not configured on the server.');
  }
  if (header !== `Bearer ${expected}`) {
    throw new ApiException('UNAUTHORIZED', 'Invalid or missing cron secret.');
  }
}
