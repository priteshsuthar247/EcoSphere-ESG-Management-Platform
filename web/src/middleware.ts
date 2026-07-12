// src/middleware.ts
// RBAC Middleware — runs on the Edge runtime.
// Protects dashboard routes and redirects based on role.
// Uses 'jose' for Edge-compatible JWT verification.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';

type UserRole = 'admin' | 'ceo' | 'departmental_head' | 'employee';

interface AppJWTPayload extends JoseJWTPayload {
  id: number;
  email: string;
  role: UserRole;
  name: string;
  department_id: number | null;
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// Routes accessible without authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/api/auth/login', '/api/auth/signup'];

// Dashboard routes each role is allowed to access
const ROLE_ALLOWED_PATHS: Record<UserRole, string[]> = {
  admin:             ['/dashboard/admin', '/dashboard/ceo', '/dashboard/departmental-head', '/dashboard/employee', '/dashboard/settings', '/dashboard/environmental', '/dashboard/social', '/dashboard/governance', '/dashboard/gamification', '/dashboard/reports'],
  ceo:               ['/dashboard/ceo', '/dashboard/departmental-head', '/dashboard/employee', '/dashboard/environmental', '/dashboard/social', '/dashboard/governance', '/dashboard/gamification', '/dashboard/reports'],
  departmental_head: ['/dashboard/departmental-head', '/dashboard/employee', '/dashboard/environmental', '/dashboard/social', '/dashboard/governance', '/dashboard/gamification'],
  employee:          ['/dashboard/employee', '/dashboard/social', '/dashboard/governance', '/dashboard/gamification'],
};

function getDashboardRedirect(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin:             '/dashboard/admin',
    ceo:               '/dashboard/ceo',
    departmental_head: '/dashboard/departmental-head',
    employee:          '/dashboard/employee',
  };
  return map[role] ?? '/dashboard/employee';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT
  let payload: AppJWTPayload | null = null;
  try {
    const { payload: jwtPayload } = await jwtVerify(token, JWT_SECRET);
    payload = jwtPayload as AppJWTPayload;
  } catch {
    // Invalid/expired token — clear cookie and redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth-token');
    return response;
  }

  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = payload.role as UserRole;

  // Root redirect → role-based dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL(getDashboardRedirect(role), request.url));
  }

  // /dashboard root → role-specific dashboard
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(getDashboardRedirect(role), request.url));
  }

  // RBAC: Check if user is allowed to access the requested dashboard route
  if (pathname.startsWith('/dashboard/')) {
    const allowedPaths = ROLE_ALLOWED_PATHS[role] ?? [];
    const isAllowed = allowedPaths.some((p) => pathname.startsWith(p));

    if (!isAllowed) {
      // Redirect to their own dashboard instead of showing 403
      return NextResponse.redirect(new URL(getDashboardRedirect(role), request.url));
    }
  }

  // Inject user info into request headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id',   String(payload.id));
  requestHeaders.set('x-user-role', role);
  requestHeaders.set('x-user-name', payload.name ?? '');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
