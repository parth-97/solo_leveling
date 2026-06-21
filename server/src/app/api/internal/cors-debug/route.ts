import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * TEMPORARY DEBUG ROUTE — delete this file once CORS is confirmed working.
 *
 * Visit it directly in the browser (GET, no auth needed):
 *   https://solo-leveling-liart.vercel.app/api/internal/cors-debug
 *
 * It echoes back exactly what the server sees for:
 *  - the raw ALLOWED_ORIGINS / ALLOWED_ORIGIN_PATTERNS env vars (with
 *    visible [START]...[END] markers so trailing spaces/newlines are obvious)
 *  - the parsed pattern list and the regex each pattern compiles to
 *  - whether a sample origin (passed as ?origin=...) matches
 */
export async function GET(request: NextRequest) {
  const rawOrigins = process.env.ALLOWED_ORIGINS ?? null;
  const rawPatterns = process.env.ALLOWED_ORIGIN_PATTERNS ?? null;

  const allowedOrigins = (rawOrigins ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const patternStrings = (rawPatterns ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const compiledPatterns = patternStrings.map((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return { pattern, regexSource: `^${escaped}$` };
  });

  const url = new URL(request.url);
  const testOrigin = url.searchParams.get('origin');
  const requestOrigin = request.headers.get('origin');

  function matches(origin: string) {
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return 'exact-match';
    for (const { pattern, regexSource } of compiledPatterns) {
      if (new RegExp(regexSource).test(origin)) return `pattern-match: ${pattern}`;
    }
    return 'no-match';
  }

  return NextResponse.json({
    env_raw: {
      ALLOWED_ORIGINS: rawOrigins === null ? 'NOT SET' : `[START]${rawOrigins}[END]`,
      ALLOWED_ORIGIN_PATTERNS: rawPatterns === null ? 'NOT SET' : `[START]${rawPatterns}[END]`,
    },
    parsed: {
      allowedOrigins,
      compiledPatterns,
    },
    requestOriginHeader: requestOrigin,
    requestOriginResult: requestOrigin ? matches(requestOrigin) : 'no Origin header sent',
    testOriginParam: testOrigin,
    testOriginResult: testOrigin ? matches(testOrigin) : 'pass ?origin=... to test a specific value',
  });
}
