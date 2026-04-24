/**
 * Centralized permission matrix for Fichaje-SaaS (web).
 *
 * Source of truth for UI gating across admin/employee routes.
 * KIOSK is intentionally excluded — it is a shared-device hardware
 * login and must not appear in role-based UI checks.
 */

export type Role =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'DIRECCION_GENERAL'
  | 'DIRECCION_CLINICA'
  | 'RRHH'
  | 'ODONTOLOGO'
  | 'AUXILIAR';

export type Permission =
  | 'clock:in-out'
  | 'entries:view-own'
  | 'entries:view-team'
  | 'entries:approve'
  | 'reports:view'
  | 'payroll:export'
  | 'employees:manage'
  | 'settings:manage';

export const PERMISSIONS: Record<Permission, Role[]> = {
  'clock:in-out':      ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH', 'ODONTOLOGO', 'AUXILIAR'],
  'entries:view-own':  ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH', 'ODONTOLOGO', 'AUXILIAR'],
  'entries:view-team': ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'entries:approve':   ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'reports:view':      ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'payroll:export':    ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'employees:manage':  ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL', 'DIRECCION_CLINICA', 'RRHH'],
  'settings:manage':   ['SUPERADMIN', 'ADMIN', 'DIRECCION_GENERAL'],
};

export function can(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  // KIOSK is never granted role-based permissions in the UI.
  if (role === 'KIOSK') return false;
  const allowed = PERMISSIONS[permission];
  return allowed ? allowed.includes(role as Role) : false;
}

export function canAny(role: string | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function canAll(role: string | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}
