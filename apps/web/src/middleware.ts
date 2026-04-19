import { NextRequest, NextResponse } from 'next/server';

/* ─── Rutas públicas (sin autenticación) ───────────────────────── */
const PUBLIC_PATHS = ['/login', '/sso', '/kiosk', '/api/v1/health', '/api/v1/kiosk', '/api/v1/auth/hub-sso'];

/* ─── Redirección por rol ──────────────────────────────────────── */
const ROLE_HOME: Record<string, string> = {
  SUPERADMIN:    '/superadmin/dashboard',
  COMPANY_ADMIN: '/admin/dashboard',
  HR:            '/admin/dashboard',
  MANAGER:       '/admin/dashboard',
  EMPLOYEE:      '/dashboard',
  KIOSK:         '/kiosk',
};

/* ─── Secciones por rol ────────────────────────────────────────── */
function allowedForRole(role: string, pathname: string): boolean {
  if (pathname.startsWith('/superadmin')) return role === 'SUPERADMIN';
  if (pathname.startsWith('/admin'))      return ['SUPERADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(role);
  // employee routes: /dashboard, /history, /schedule, /leave-requests, /incidents
  return true; // API routes + employee pages open to all authenticated
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets & Next internals — always pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // API routes — let them handle their own auth
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // Public paths — always accessible
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (isPublic) return NextResponse.next();

  // Check auth cookie
  const accessToken = req.cookies.get('access_token')?.value;
  const userCookie  = req.cookies.get('user')?.value;

  if (!accessToken || !userCookie) {
    // Not authenticated → redirect to login
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Parse role from cookie
  let role = 'EMPLOYEE';
  try {
    role = JSON.parse(userCookie).role ?? 'EMPLOYEE';
  } catch {
    // invalid cookie → redirect to login
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Root → redirect to role home
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[role] ?? '/dashboard';
    return NextResponse.redirect(url);
  }

  // Wrong section → redirect to role home
  if (!allowedForRole(role, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[role] ?? '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
