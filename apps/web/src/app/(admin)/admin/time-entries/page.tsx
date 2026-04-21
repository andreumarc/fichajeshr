'use client';
import { Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import dayjs from 'dayjs';
import { Filter, Download, MapPin, MapPinOff, Edit2, Trash2, Loader2 } from 'lucide-react';

const typeLabels: Record<string, string> = {
  CHECK_IN: 'Entrada',
  CHECK_OUT: 'Salida',
  BREAK_START: 'Inicio pausa',
  BREAK_END: 'Fin pausa',
  INCIDENT: 'Incidencia',
  CENTER_CHANGE: 'Cambio centro',
};

const statusBadge: Record<string, string> = {
  VALID: 'badge-green',
  OUT_OF_ZONE: 'badge-yellow',
  MANUAL: 'badge-blue',
  PENDING_REVIEW: 'badge-gray',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
};

export default function TimeEntriesPage() {
  return (
    <Suspense fallback={null}>
      <TimeEntriesPageInner />
    </Suspense>
  );
}

function TimeEntriesPageInner() {
  const globalFilters = useGlobalFilters();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({
    from: dayjs().format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
    page: 1,
    limit: 50,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['time-entries', filters, ...globalFilters.queryKeyPart],
    queryFn: () =>
      api
        .get('/time-entries', {
          params: {
            ...globalFilters.httpParams,
            ...filters,
            from: `${filters.from}T00:00:00`,
            to: `${filters.to}T23:59:59`,
          },
        })
        .then((r) => r.data),
  });

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} elemento${selected.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.delete(`/time-entries/${id}`)));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['time-entries'] });
    } catch (e) {
      alert('Error al eliminar algunos elementos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExport = async () => {
    const res = await api.get('/reports/export-excel', {
      params: { from: `${filters.from}T00:00:00`, to: `${filters.to}T23:59:59` },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fichajes_${filters.from}_${filters.to}.xlsx`;
    a.click();
  };

  const columnHeaders = [
    'Empleado',
    'Tipo',
    'Fecha',
    'Centro de trabajo',
    'Estado',
    'Ubicación',
    'Método',
    '',
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fichajes</h1>
        <button onClick={handleExport} className="btn-secondary text-sm gap-2">
          <Download size={16} /> Exportar
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
              className="input text-sm px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
              className="input text-sm px-3 py-2"
            />
          </div>
          <button onClick={() => refetch()} className="btn-primary text-sm px-4 py-2">
            <Filter size={14} /> Filtrar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
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
                {columnHeaders.map((h, idx) => (
                  <th key={idx} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando...</td></tr>
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No hay fichajes para este período</td></tr>
              ) : (
                data?.data?.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        checked={selected.has(entry.id)}
                        onChange={e => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(entry.id);
                          else next.delete(entry.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">
                        {entry.employee?.firstName} {entry.employee?.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{entry.employee?.employeeCode}</p>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {typeLabels[entry.type] ?? entry.type}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {dayjs(entry.timestamp).format('DD/MM/YYYY HH:mm:ss')}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {entry.workCenter?.name ?? '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={statusBadge[entry.status] ?? 'badge-gray'}>
                        {entry.status}
                      </span>
                      {entry.isManual && (
                        <span className="badge-blue ml-1">Manual</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {entry.latitude ? (
                        <span className={`flex items-center gap-1 text-xs ${entry.isWithinZone ? 'text-green-600' : 'text-amber-600'}`}>
                          {entry.isWithinZone ? <MapPin size={12} /> : <MapPinOff size={12} />}
                          {entry.isWithinZone ? 'En zona' : `${entry.distanceToCenter}m`}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">Sin GPS</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">{entry.clockMethod}</td>
                    <td className="py-3 px-4">
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Editar">
                        <Edit2 size={14} className="text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > data.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {data.total} registros en total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setFilters((f) => ({ ...f, page: f.page - 1 })); setSelected(new Set()); }}
                disabled={filters.page === 1}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="flex items-center text-sm text-gray-500">
                Página {filters.page} de {Math.ceil(data.total / data.limit)}
              </span>
              <button
                onClick={() => { setFilters((f) => ({ ...f, page: f.page + 1 })); setSelected(new Set()); }}
                disabled={filters.page >= Math.ceil(data.total / data.limit)}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-brand-800 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-brand-900/40">
          <span className="text-sm font-semibold">
            {selected.size} {selected.size !== 1 ? 'seleccionados' : 'seleccionado'}
          </span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Deseleccionar todo
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {bulkDeleting
              ? <><Loader2 size={13} className="animate-spin" />Cargando...</>
              : <><Trash2 size={13} />Eliminar {selected.size}</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
