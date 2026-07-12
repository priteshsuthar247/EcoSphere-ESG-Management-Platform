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

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

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
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  // Redirect to login if no token
  if (!token) {
    // Allow unauthenticated API calls to return 401 from the route (except we block dashboard)
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }
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
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth-token');
    return response;
  }

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = payload.role as UserRole;
  const home = getRoleHome(role);

  // Root redirect → role-based dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // /dashboard root → role-specific dashboard
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // RBAC: Check if user is allowed to access the requested dashboard route
  if (pathname.startsWith('/dashboard/')) {
    if (!canAccessPath(role, pathname)) {
      // Redirect to their own dashboard instead of showing 403
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

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
