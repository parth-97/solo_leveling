import { NextResponse } from 'next/server';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/** Returns CORS headers for the given request origin, if allowed. */
export function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin =
    origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) ? origin : allowedOrigins[0] ?? '*';

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
