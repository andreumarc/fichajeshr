/**
 * Active clinic helpers.
 *
 * The `active_clinic_id` cookie stores the currently selected WorkCenter id
 * for users with access to >1 clinic. It is set client-side by the
 * <ClinicSwitcher/> component and read by:
 *   - Server route handlers via `getActiveClinicId(req)` to filter listings.
 *   - Server components / layouts via `getActiveClinicIdFromCookies()`.
 *
 * Empty string / missing cookie → no active filter (show all accessible).
 */
import type { NextRequest } from 'next/server'

export const ACTIVE_CLINIC_COOKIE = 'active_clinic_id'

/** Read the active clinic id from a Next.js request (route handlers). */
export function getActiveClinicId(req: NextRequest): string | null {
  const v = req.cookies.get(ACTIVE_CLINIC_COOKIE)?.value
  return v && v.length > 0 ? v : null
}

/** Read the active clinic id from a plain cookie header string. */
export function parseActiveClinicIdFromCookieHeader(header: string | null): string | null {
  if (!header) return null
  const match = header.split(/;\s*/).find((c) => c.startsWith(`${ACTIVE_CLINIC_COOKIE}=`))
  if (!match) return null
  const v = decodeURIComponent(match.slice(ACTIVE_CLINIC_COOKIE.length + 1))
  return v.length > 0 ? v : null
}
