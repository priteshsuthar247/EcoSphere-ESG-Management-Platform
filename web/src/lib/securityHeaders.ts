// Shared security response headers for API routes and middleware.

import { NextResponse } from 'next/server';

/** Apply standard security headers to any NextResponse */
export function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  // Avoid caching authenticated HTML/API by default when caller didn't set one
  if (!res.headers.has('Cache-Control')) {
    res.headers.set('Cache-Control', 'no-store');
  }
  return res;
}
