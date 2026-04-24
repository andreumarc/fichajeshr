'use client'
/**
 * ClinicSwitcher — compact dropdown in the admin topbar that lets users
 * with access to >1 work center pick an "active clinic". The choice is
 * persisted to both a cookie (`active_clinic_id`, read by server route
 * handlers via `getActiveClinicId`) and localStorage (for quick client reads).
 *
 * Behavior:
 *   - Hidden entirely when the user has 0 or 1 accessible work centers.
 *   - On change: writes cookie+localStorage and triggers a soft refresh so
 *     server-rendered lists re-fetch with the new filter.
 */
import { useEffect, useState } from 'react'
import { Building2, ChevronDown, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import api from '@/lib/api'
import clsx from 'clsx'

type WorkCenter = { id: string; name: string; companyId: string }

const COOKIE = 'active_clinic_id'
const LS_KEY = 'fichajeshr-active-clinic-id'

export function ClinicSwitcher() {
  const router = useRouter()
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [active, setActive] = useState<string>('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Restore previous selection (cookie wins, fall back to localStorage)
    const cookieVal = Cookies.get(COOKIE) ?? ''
    const lsVal = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) ?? '' : ''
    setActive(cookieVal || lsVal || '')

    api.get('/filters/context')
      .then((r) => setWorkCenters(r.data?.workCenters ?? []))
      .catch(() => {})
  }, [])

  // Single-clinic users: auto-pin and hide.
  useEffect(() => {
    if (workCenters.length === 1 && active !== workCenters[0].id) {
      persist(workCenters[0].id)
    }
    if (workCenters.length === 0 && active) {
      persist('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workCenters])

  function persist(id: string) {
    if (id) {
      Cookies.set(COOKIE, id, { path: '/', sameSite: 'lax', expires: 365 })
      localStorage.setItem(LS_KEY, id)
    } else {
      Cookies.remove(COOKIE, { path: '/' })
      localStorage.removeItem(LS_KEY)
    }
    setActive(id)
  }

  if (workCenters.length <= 1) return null

  const current = workCenters.find((w) => w.id === active)
  const label = current?.name ?? 'Todas las clínicas'

  const select = (id: string) => {
    persist(id)
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex items-center gap-2 text-xs border rounded-lg px-2.5 py-1.5 bg-white transition-colors',
          active
            ? 'border-teal-400 text-teal-700 font-medium'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50',
        )}
        title="Clínica activa"
      >
        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate max-w-[140px]">{label}</span>
        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[220px] max-h-72 overflow-y-auto">
            <button
              onClick={() => select('')}
              className={clsx(
                'w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2',
                !active && 'text-teal-600 font-medium',
              )}
            >
              {!active ? <Check className="w-3 h-3 flex-shrink-0" /> : <span className="w-3" />}
              Todas las clínicas
            </button>
            <div className="border-t border-gray-100 mt-1 pt-1">
              {workCenters.map((w) => {
                const sel = w.id === active
                return (
                  <button
                    key={w.id}
                    onClick={() => select(w.id)}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2',
                      sel && 'text-teal-600 font-medium',
                    )}
                  >
                    {sel ? <Check className="w-3 h-3 flex-shrink-0" /> : <span className="w-3" />}
                    {w.name}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
