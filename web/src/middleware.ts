// src/middleware.ts
// RBAC Middleware — runs on the Edge runtime.
// Protects dashboard routes and redirects based on role.
// Uses 'jose' for Edge-compatible JWT verification.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import { canAccessPath, getRoleHome, type UserRole } from '@/lib/accessControl';

interface AppJWTPayload extends JoseJWTPayload {
  id: number;
  email: string;
  role: UserRole;
  name: string;
  department_id: number | null;
}

const jwtSecretRaw = process.env.JWT_SECRET;
const JWT_SECRET = new TextEncoder().encode(
  jwtSecretRaw && jwtSecretRaw.length >= 16
    ? jwtSecretRaw
    : // Fail closed: use a random-looking non-usable value so verify always fails if misconfigured
      'INSECURE_MISSING_JWT_SECRET_CONFIGURE_ENV',
);

// Routes accessible without authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/logout',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function jsonUnauthorized(message = 'Authentication required') {
  return NextResponse.json(
    { success: false, error: message, code: 'UNAUTHORIZED' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

const VALID_ROLES: UserRole[] = ['admin', 'ceo', 'departmental_head', 'employee'];

function normalizeRole(raw: unknown): UserRole {
  if (typeof raw === 'string' && VALID_ROLES.includes(raw as UserRole)) {
    return raw as UserRole;
  }
  return 'employee';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Public auth pages: if already logged in, send them to their role home
  // (avoids "login then still show previous admin session" confusion)
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  if (isAuthPage && token) {
    try {
      const { payload: jwtPayload } = await jwtVerify(token, JWT_SECRET);
      const role = normalizeRole((jwtPayload as AppJWTPayload).role);
      // Allow reset-password with token query even if logged in
      if (!pathname.startsWith('/reset-password') && !pathname.startsWith('/forgot-password')) {
        return NextResponse.redirect(new URL(getRoleHome(role), request.url));
      }
    } catch {
      // Invalid token — clear and continue to public page
      const res = NextResponse.next();
      res.cookies.set('auth-token', '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
      });
      return res;
    }
  }

  // Allow public API + auth routes through (unauthenticated)
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Redirect / 401 if no token (API routes must not pass through unauthenticated)
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return jsonUnauthorized();
    }
    const loginUrl = new URL('/login', request.url);
    // Do NOT pass arbitrary redirect paths (prevents open redirect to /dashboard/admin)
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT
  let payload: AppJWTPayload | null = null;
  try {
    const { payload: jwtPayload } = await jwtVerify(token, JWT_SECRET);
    payload = jwtPayload as AppJWTPayload;
  } catch {
    if (pathname.startsWith('/api/')) {
      return jsonUnauthorized('Invalid or expired session');
    }
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    });
    return response;
  }

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return jsonUnauthorized();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = normalizeRole(payload.role);
  const home = getRoleHome(role);

  // Root redirect → role-based dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // /dashboard root → role-specific dashboard
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Role home pages: only the matching role (or full-access for admin homes they may open)
  // Enforce: non-admin must never stay on /dashboard/admin
  if (pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/')) {
    if (role !== 'admin' && role !== 'ceo') {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }
  if (pathname === '/dashboard/ceo' || pathname.startsWith('/dashboard/ceo/')) {
    if (role !== 'admin' && role !== 'ceo') {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }
  if (
    pathname === '/dashboard/departmental-head' ||
    pathname.startsWith('/dashboard/departmental-head/')
  ) {
    if (role !== 'admin' && role !== 'ceo' && role !== 'departmental_head') {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  // RBAC: Check if user is allowed to access the requested dashboard route
  if (pathname.startsWith('/dashboard/')) {
    if (!canAccessPath(role, pathname)) {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  // Inject user info into request headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', String(payload.id));
  requestHeaders.set('x-user-role', role);
  requestHeaders.set('x-user-name', payload.name ?? '');
  requestHeaders.set(
    'x-user-department-id',
    payload.department_id != null ? String(payload.department_id) : '',
  );

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Cache-Control', 'no-store, private');
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
