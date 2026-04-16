import { NextRequest, NextResponse } from 'next/server';
import { verifyAccess } from './jwt';

export interface AuthUser {
  sub: string;       // userId
  email: string;
  role: string;
  companyId?: string;
  employeeId?: string;
}

export function getAuth(req: NextRequest): AuthUser | null {
  const header = req.headers.get('authorization') ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return verifyAccess(token) as AuthUser;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest, allowedRoles?: string[]) {
  const user = getAuth(req);
  if (!user) return { user: null, error: NextResponse.json({ message: 'No autorizado' }, { status: 401 }) };
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { user: null, error: NextResponse.json({ message: 'Acceso denegado' }, { status: 403 }) };
  }
  return { user, error: null };
}

/** Extract request metadata (IP, user agent) */
export function getMeta(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown',
    userAgent: req.headers.get('user-agent') ?? 'unknown',
  };
}
