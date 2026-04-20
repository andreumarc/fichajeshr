'use client'
/**
 * GlobalFilters — top-level filter bar for FichajeHR admin pages.
 * Reads/writes URL params: date_from, date_to, company_id, work_center_ids (csv).
 * Role gating:
 *   - Empresa selector: only for SUPERADMIN (others have 1 company).
 *   - WorkCenter multi-select: shown whenever the effective company has >=1 WC.
 * Visible to all admin roles (SUPERADMIN, COMPANY_ADMIN, MANAGER, HR).
 */
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { SlidersHorizontal, ChevronDown, Check, X } from 'lucide-react'
import Cookies from 'js-cookie'
import api from '@/lib/api'
import clsx from 'clsx'

type Company    = { id: string; name: string }
type WorkCenter = { id: string; name: string; companyId: string }
type Period = 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom'

const LABELS: Record<Period, string> = {
  today: 'Hoy', yesterday: 'Ayer', '7days': '7 días', '30days': '30 días',
  this_month: 'Este mes', last_month: 'Mes anterior', custom: 'Personalizado',
}

const PERIOD_ORDER: Period[] = ['today', 'yesterday', '7days', '30days', 'this_month', 'last_month']
const LS_COMPANY    = 'fichajeshr-filter-company'
const LS_WORKCENTER = 'fichajeshr-filter-workcenters'

function fmt(d: Date) { return d.toISOString().slice(0, 10) }
function getRange(p: Period): { from: string; to: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const yest  = new Date(now); yest.setDate(now.getDate() - 1)
  const lmf   = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lml   = new Date(now.getFullYear(), now.getMonth(), 0)
  const d7    = new Date(now); d7.setDate(now.getDate() - 7)
  const d30   = new Date(now); d30.setDate(now.getDate() - 30)
  const map: Record<Period, { from: string; to: string }> = {
    today:      { from: fmt(now),  to: fmt(now)  },
    yesterday:  { from: fmt(yest), to: fmt(yest) },
    '7days':    { from: fmt(d7),   to: fmt(now)  },
    '30days':   { from: fmt(d30),  to: fmt(now)  },
    this_month: { from: fmt(first),to: fmt(last) },
    last_month: { from: fmt(lmf),  to: fmt(lml)  },
    custom:     { from: '',        to: ''        },
  }
  return map[p]
}
function detectPeriod(from: string, to: string): Period | 'custom' {
  if (!from || !to) return 'custom'
  for (const p of PERIOD_ORDER) {
    const r = getRange(p)
    if (r.from === from && r.to === to) return p
  }
  return 'custom'
}

export function GlobalFilters() {
  const router = useRouter()
  const sp     = useSearchParams()
  const pathname = usePathname()

  const [role, setRole] = useState<string>('')
  const [companies, setCompanies]     = useState<Company[]>([])
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [wcOpen, setWcOpen] = useState(false)

  const companyId    = sp.get('company_id')       ?? ''
  const wcIdsParam   = sp.get('work_center_ids')  ?? ''
  const dateFrom     = sp.get('date_from')        ?? ''
  const dateTo       = sp.get('date_to')          ?? ''
  const activePeriod = detectPeriod(dateFrom, dateTo)

  useEffect(() => {
    try {
      const u = JSON.parse(Cookies.get('user') ?? '{}')
      setRole(u.role ?? '')
    } catch { setRole('') }
  }, [])

  useEffect(() => {
    api.get('/filters/context')
      .then((r) => {
        setCompanies(r.data?.companies ?? [])
        setWorkCenters(r.data?.workCenters ?? [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => { if (companyId) localStorage.setItem(LS_COMPANY, companyId) }, [companyId])
  useEffect(() => { localStorage.setItem(LS_WORKCENTER, wcIdsParam) },          [wcIdsParam])

  const nav = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(sp.toString())
    Object.entries(updates).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k))
    router.push(`${pathname}?${params.toString()}`)
  }, [router, sp, pathname])

  // Defaults: restore filters on first nav if missing
  useEffect(() => {
    const params = new URLSearchParams(sp.toString())
    let changed = false
    if (!params.get('date_from') || !params.get('date_to')) {
      const { from, to } = getRange('this_month')
      params.set('date_from', from); params.set('date_to', to); changed = true
    }
    if (!params.get('company_id')) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_COMPANY) : null
      const fallback = saved || companies[0]?.id
      if (fallback) { params.set('company_id', fallback); changed = true }
    }
    if (!params.get('work_center_ids')) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_WORKCENTER) : null
      if (saved) { params.set('work_center_ids', saved); changed = true }
    }
    if (changed) router.replace(`${pathname}?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, companies])

  const selectPeriod = (p: Period) => {
    if (p === 'custom') return
    const { from, to } = getRange(p)
    nav({ date_from: from, date_to: to })
  }

  const effectiveCompanyWCs = workCenters.filter(
    (wc) => !companyId || wc.companyId === companyId,
  )
  const selectedWcIds = wcIdsParam ? wcIdsParam.split(',').filter(Boolean) : []

  const toggleWc = (id: string) => {
    const next = selectedWcIds.includes(id)
      ? selectedWcIds.filter((x) => x !== id)
      : [...selectedWcIds, id]
    nav({ work_center_ids: next.join(',') })
    setWcOpen(false)
  }
  const clearWcs = () => { nav({ work_center_ids: '' }); setWcOpen(false) }

  const wcLabel = selectedWcIds.length === 0
    ? 'Todos los centros'
    : selectedWcIds.length === 1
      ? (effectiveCompanyWCs.find((w) => w.id === selectedWcIds[0])?.name ?? '1 centro')
      : `${selectedWcIds.length} centros`

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 flex-shrink-0">
      <div className="flex items-center gap-1.5 text-teal-700 shrink-0">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wider hidden sm:inline">Filtros</span>
      </div>
      <div className="w-px h-4 bg-gray-200 shrink-0 hidden sm:block" />

      {/* Period pills */}
      <div className="flex flex-wrap gap-1">
        {PERIOD_ORDER.map((p) => (
          <button key={p} onClick={() => selectPeriod(p)}
            className={clsx(
              'px-3 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap',
              activePeriod === p
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100',
            )}>
            {LABELS[p]}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[11px] text-gray-400 hidden sm:inline">Desde</span>
        <input type="date" value={dateFrom}
          onChange={(e) => nav({ date_from: e.target.value, date_to: dateTo })}
          className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 w-32" />
        <span className="text-[11px] text-gray-400 hidden sm:inline">hasta</span>
        <input type="date" value={dateTo}
          onChange={(e) => nav({ date_from: dateFrom, date_to: e.target.value })}
          className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 w-32" />
      </div>

      {/* Empresa — superadmin only */}
      {role === 'SUPERADMIN' && companies.length > 1 && (
        <>
          <div className="w-px h-4 bg-gray-200 shrink-0 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500 hidden sm:inline">Empresa</span>
            <select value={companyId}
              onChange={(e) => nav({ company_id: e.target.value, work_center_ids: '' })}
              className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white">
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* WorkCenter multi-select */}
      {effectiveCompanyWCs.length > 0 && (
        <>
          <div className="w-px h-4 bg-gray-200 shrink-0 hidden sm:block" />
          <div className="relative">
            <button onClick={() => setWcOpen((o) => !o)}
              className={clsx(
                'flex items-center gap-1.5 text-[11px] border rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white transition-colors',
                selectedWcIds.length > 0 ? 'border-teal-400 text-teal-700 font-medium' : 'border-gray-200 text-gray-600',
              )}>
              {wcLabel}
              <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
            </button>
            {wcOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setWcOpen(false)} />
                <div className="absolute left-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[200px] max-h-60 overflow-y-auto">
                  <button onClick={clearWcs}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2',
                      selectedWcIds.length === 0 && 'text-teal-600 font-medium',
                    )}>
                    {selectedWcIds.length === 0 && <Check className="w-3 h-3 flex-shrink-0" />}
                    <span className={selectedWcIds.length === 0 ? '' : 'ml-5'}>Todos los centros</span>
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    {effectiveCompanyWCs.map((w) => {
                      const sel = selectedWcIds.includes(w.id)
                      return (
                        <button key={w.id} onClick={() => toggleWc(w.id)}
                          className={clsx(
                            'w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2',
                            sel && 'text-teal-600 font-medium',
                          )}>
                          {sel ? <Check className="w-3 h-3 flex-shrink-0" /> : <span className="ml-5" />}
                          {w.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          {selectedWcIds.length > 0 && (
            <button onClick={clearWcs} className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
              <X className="w-3 h-3" />
            </button>
          )}
        </>
      )}
    </div>
  )
}
