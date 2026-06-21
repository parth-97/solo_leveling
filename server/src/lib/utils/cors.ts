import { NextResponse } from 'next/server';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// ALLOWED_ORIGIN_PATTERNS supports simple "*" wildcards, e.g.
//   https://solo-leveling-oqtw-*-parth-8256s-projects.vercel.app
// This covers every Vercel preview/deployment URL for the same project
// (the part between the project name and "-parth-8256s-projects.vercel.app"
// changes on every single deploy, so an exact-match list can't keep up).
const allowedOriginPatterns = (process.env.ALLOWED_ORIGIN_PATTERNS ?? '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)
  .map((pattern) => {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape regex special chars
      .replace(/\*/g, '.*');                 // turn * into a real wildcard
    return new RegExp(`^${escaped}$`);
  });

function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return true;
  return allowedOriginPatterns.some((re) => re.test(origin));
}

/** Returns CORS headers for the given request origin, if allowed. */
export function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && isOriginAllowed(origin) ? origin : allowedOrigins[0] ?? '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

/** Standard OPTIONS (preflight) handler — re-export this as `OPTIONS` from each route. */
export function handleOptions(request: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  });
}
