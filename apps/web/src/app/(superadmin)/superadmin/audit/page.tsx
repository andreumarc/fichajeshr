'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ShieldCheck, ChevronLeft, ChevronRight, Loader2, Search, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';

const ACTION_BADGE: Record<string, string> = {
  LOGIN:             'bg-emerald-100 text-emerald-700',
  LOGOUT:            'bg-slate-100 text-slate-600',
  LOGIN_FAILED:      'bg-rose-100 text-rose-700',
  CLOCK_IN:          'bg-blue-100 text-blue-700',
  CLOCK_OUT:         'bg-blue-100 text-blue-700',
  BREAK_START:       'bg-amber-100 text-amber-700',
  BREAK_END:         'bg-amber-100 text-amber-700',
  MANUAL_EDIT:       'bg-violet-100 text-violet-700',
  CREATE:            'bg-emerald-100 text-emerald-700',
  UPDATE:            'bg-sky-100 text-sky-700',
  DELETE:            'bg-rose-100 text-rose-700',
  EXPORT:            'bg-slate-100 text-slate-600',
  PASSWORD_RESET:    'bg-amber-100 text-amber-700',
  PIN_RESET:         'bg-amber-100 text-amber-700',
  PERMISSION_CHANGE: 'bg-violet-100 text-violet-700',
  CONFIG_CHANGE:     'bg-violet-100 text-violet-700',
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN:             'Inicio sesión',
  LOGOUT:            'Cierre sesión',
  LOGIN_FAILED:      'Login fallido',
  CLOCK_IN:          'Entrada',
  CLOCK_OUT:         'Salida',
  BREAK_START:       'Inicio pausa',
  BREAK_END:         'Fin pausa',
  MANUAL_EDIT:       'Edición manual',
  CREATE:            'Creación',
  UPDATE:            'Actualización',
  DELETE:            'Borrado',
  EXPORT:            'Exportación',
  PASSWORD_RESET:    'Reset contraseña',
  PIN_RESET:         'Reset PIN',
  PERMISSION_CHANGE: 'Cambio permisos',
  CONFIG_CHANGE:     'Configuración',
};

const ACTIONS = Object.keys(ACTION_LABELS);

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  before: any;
  after: any;
  user: { firstName: string; lastName: string; email: string } | null;
  company: { name: string } | null;
}

interface AuditResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export default function SuperAdminAuditPage() {
  const [filters, setFilters] = useState({
    action:     '',
    entityType: '',
    from: dayjs().startOf('week').format('YYYY-MM-DD'),
    to:   dayjs().format('YYYY-MM-DD'),
    page:  1,
    limit: 50,
  });

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ['superadmin-audit', filters],
    queryFn: () =>
      api.get('/superadmin/audit', {
        params: {
          ...filters,
          action:     filters.action || undefined,
          entityType: filters.entityType || undefined,
          from: `${filters.from}T00:00:00`,
          to:   `${filters.to}T23:59:59`,
        },
      }).then(r => r.data),
  });

  const totalPages = data ? Math.ceil((data.total ?? 0) / filters.limit) : 1;
  const setFilter = (key: string, val: any) =>
    setFilters(prev => ({ ...prev, [key]: val, page: 1 }));

  function fmt(d: string) {
    return new Date(d).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
          <ShieldCheck size={18} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Auditoría global</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Registro de actividad de todas las empresas · {data?.total ?? 0} eventos
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            className="input pr-10 appearance-none cursor-pointer"
            value={filters.action}
            onChange={e => setFilter('action', e.target.value)}
          >
            <option value="">Todas las acciones</option>
            {ACTIONS.map(a => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <input
            className="input pr-3"
            placeholder="Entidad (Employee, TimeEntry…)"
            value={filters.entityType}
            onChange={e => setFilter('entityType', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input"
            value={filters.from}
            onChange={e => setFilter('from', e.target.value)}
          />
          <span className="text-slate-400 text-sm">→</span>
          <input
            type="date"
            className="input"
            value={filters.to}
            onChange={e => setFilter('to', e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando registros...</span>
          </div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="text-center py-20">
            <ShieldCheck size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay registros de auditoría con los filtros aplicados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Fecha</th>
                  <th className="table-header">Acción</th>
                  <th className="table-header">Entidad</th>
                  <th className="table-header">Usuario</th>
                  <th className="table-header">Empresa</th>
                  <th className="table-header">IP</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((log, idx) => (
                  <tr
                    key={log.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
                    <td className="table-cell text-slate-500 text-sm tabular-nums whitespace-nowrap">
                      {fmt(log.createdAt)}
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${ACTION_BADGE[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{log.entityType}</p>
                        {log.entityId && (
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[120px]">{log.entityId}</p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {log.user ? (
                        <div>
                          <p className="text-sm font-medium text-brand-800">
                            {log.user.firstName} {log.user.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="table-cell text-slate-600 text-sm">
                      {log.company?.name ?? '—'}
                    </td>
                    <td className="table-cell text-slate-400 font-mono text-xs">
                      {log.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Página {filters.page} de {totalPages} ({data?.total ?? 0} registros)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={filters.page === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={filters.page === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
