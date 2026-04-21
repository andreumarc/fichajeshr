'use client';
import { Suspense, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import dayjs from 'dayjs';
import {
  AlertCircle, CheckCircle2, Clock3, XCircle, ChevronLeft,
  ChevronRight, Filter, MessageSquare, Loader2, Trash2,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  OPEN:       { label: 'Abierta',     cls: 'badge-yellow', icon: AlertCircle },
  IN_REVIEW:  { label: 'En revisión', cls: 'badge-blue',   icon: Clock3 },
  RESOLVED:   { label: 'Resuelta',    cls: 'badge-green',  icon: CheckCircle2 },
  REJECTED:   { label: 'Rechazada',   cls: 'badge-red',    icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  MISSING_CHECK_IN:  'Sin entrada',
  MISSING_CHECK_OUT: 'Sin salida',
  OUT_OF_ZONE:       'Fuera de zona',
  LATE_ARRIVAL:      'Llegada tarde',
  EARLY_DEPARTURE:   'Salida anticipada',
  EXTRA_HOURS:       'Horas extra',
  MANUAL_CORRECTION: 'Corrección manual',
  OTHER:             'Otro',
};

export default function AdminIncidentsPage() {
  return (
    <Suspense fallback={null}>
      <AdminIncidentsPageInner />
    </Suspense>
  );
}

function AdminIncidentsPageInner() {
  const globalFilters = useGlobalFilters();
  const [filters, setFilters] = useState({
    status: '' as any,
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
    page: 1,
    limit: 25,
  });
  const [resolving, setResolving] = useState<{ id: string; action: string } | null>(null);
  const [resolution, setResolution] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['incidents-admin', filters, ...globalFilters.queryKeyPart],
    queryFn: () =>
      api.get('/incidents', {
        params: {
          ...globalFilters.httpParams,
          ...filters,
          status: filters.status || undefined,
          from: `${filters.from}T00:00:00`,
          to: `${filters.to}T23:59:59`,
        },
      }).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['incidents-summary', ...globalFilters.queryKeyPart],
    queryFn: () => api.get('/incidents/summary', { params: globalFilters.httpParams }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, res }: { id: string; status: string; res?: string }) =>
      api.patch(`/incidents/${id}/status`, { status, resolution: res }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents-admin'] });
      qc.invalidateQueries({ queryKey: ['incidents-summary'] });
      setResolving(null);
      setResolution('');
    },
  });

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} elemento${selected.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.delete(`/incidents/${id}`)));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['incidents-admin'] });
    } catch (e) {
      alert('Error al eliminar algunos elementos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / filters.limit) : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Incidencias</h1>
          {data && <p className="text-sm text-slate-500 mt-0.5">{data.total} incidencias</p>}
        </div>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'open',     label: 'Abiertas',      cls: 'badge-yellow', val: summary.open },
            { key: 'inReview', label: 'En revisión',   cls: 'badge-blue',   val: summary.inReview },
            { key: 'resolved', label: 'Resueltas',     cls: 'badge-green',  val: summary.resolved },
          ].map(({ label, cls, val }) => (
            <div key={label} className="card text-center py-4">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{val ?? 0}</p>
              <span className={`${cls} mt-2 inline-block`}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any, page: 1 }))}
              className="input text-sm"
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input
              type="date" value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date" value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    checked={(data?.data?.length ?? 0) > 0 && selected.size === (data?.data?.length ?? 0)}
                    onChange={e => {
                      if (e.target.checked) setSelected(new Set((data?.data ?? []).map((i: any) => i.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                {['Empleado', 'Tipo', 'Fecha', 'Descripción', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Cargando…
                  </td>
                </tr>
              ) : (data?.data?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No hay incidencias en este periodo
                  </td>
                </tr>
              ) : (
                data!.data.map((inc: any) => {
                  const cfg = STATUS_CONFIG[inc.status] ?? STATUS_CONFIG.OPEN;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={inc.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="table-cell w-10">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          checked={selected.has(inc.id)}
                          onChange={e => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(inc.id);
                            else next.delete(inc.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="table-cell">
                        <p className="font-semibold text-slate-900">
                          {inc.employee?.firstName} {inc.employee?.lastName}
                        </p>
                        <p className="text-xs text-slate-400">{inc.employee?.employeeCode}</p>
                      </td>
                      <td className="table-cell">
                        <span className="badge-gray">{TYPE_LABELS[inc.type] ?? inc.type}</span>
                      </td>
                      <td className="table-cell text-xs tabular-nums text-slate-500">
                        {dayjs(inc.occurredAt).format('DD/MM/YY HH:mm')}
                      </td>
                      <td className="table-cell max-w-xs">
                        <p className="truncate text-slate-700">{inc.description}</p>
                        {inc.resolution && (
                          <p className="text-xs text-emerald-600 mt-0.5 truncate">✓ {inc.resolution}</p>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={cfg.cls}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="table-cell">
                        {inc.status === 'OPEN' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setResolving({ id: inc.id, action: 'IN_REVIEW' })}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Poner en revisión"
                            >
                              <Clock3 size={14} />
                            </button>
                            <button
                              onClick={() => setResolving({ id: inc.id, action: 'RESOLVED' })}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Resolver"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={() => updateMutation.mutate({ id: inc.id, status: 'REJECTED' })}
                              className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Rechazar"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}
                        {inc.status === 'IN_REVIEW' && (
                          <button
                            onClick={() => setResolving({ id: inc.id, action: 'RESOLVED' })}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Resolver"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">Página {filters.page} de {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setFilters((f) => ({ ...f, page: f.page - 1 })); setSelected(new Set()); }}
                disabled={filters.page === 1}
                className="btn-secondary text-xs px-3 py-1.5 gap-1 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <button
                onClick={() => { setFilters((f) => ({ ...f, page: f.page + 1 })); setSelected(new Set()); }}
                disabled={filters.page >= totalPages}
                className="btn-secondary text-xs px-3 py-1.5 gap-1 disabled:opacity-40"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-brand-800 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-brand-900/40">
          <span className="text-sm font-semibold">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Deseleccionar
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {bulkDeleting ? <><Loader2 size={13} className="animate-spin" />Eliminando...</> : <><Trash2 size={13} />Eliminar {selected.size}</>}
          </button>
        </div>
      )}

      {/* Resolve modal */}
      {resolving && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setResolving(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900">
              {resolving.action === 'RESOLVED' ? 'Resolver incidencia' : 'Poner en revisión'}
            </h3>
            <div>
              <label className="label">
                {resolving.action === 'RESOLVED' ? 'Resolución *' : 'Nota (opcional)'}
              </label>
              <textarea
                rows={3}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe la resolución…"
                className="input resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  updateMutation.mutate({ id: resolving.id, status: resolving.action, res: resolution })
                }
                disabled={resolving.action === 'RESOLVED' && !resolution.trim() || updateMutation.isPending}
                className="btn-primary flex-1 gap-2"
              >
                {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirmar
              </button>
              <button onClick={() => setResolving(null)} className="btn-secondary px-5">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
