/**
 * Centralized permission matrix for Fichaje-SaaS (NestJS backend).
 *
 * Mirrors apps/web/src/lib/permissions.ts so server guards and UI
 * gating stay in sync. KIOSK is intentionally excluded — it is a
 * shared-device hardware login, not a role for RBAC decisions.
 */

import { UserRole } from '@prisma/client';

export type Permission =
  | 'clock:in-out'
  | 'entries:view-own'
  | 'entries:view-team'
  | 'entries:approve'
  | 'reports:view'
  | 'payroll:export'
  | 'employees:manage'
  | 'settings:manage';

type MatrixRole = Exclude<UserRole, 'KIOSK'>;

export const PERMISSIONS: Record<Permission, MatrixRole[]> = {
  'clock:in-out':      ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH', 'ODONTOLOGO', 'AUXILIAR'],
  'entries:view-own':  ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH', 'ODONTOLOGO', 'AUXILIAR'],
  'entries:view-team': ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'entries:approve':   ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'reports:view':      ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'payroll:export':    ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'employees:manage':  ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'settings:manage':   ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL'],
};

export function can(role: UserRole | string | null | undefined, permission: Permission): boolean {
  if (!role || role === 'KIOSK') return false;
  const allowed = PERMISSIONS[permission];
  return allowed ? allowed.includes(role as MatrixRole) : false;
}

/** Resolve the list of roles allowed for a permission — handy for @Roles(...rolesFor('x')). */
export function rolesFor(permission: Permission): MatrixRole[] {
  return PERMISSIONS[permission];
}
