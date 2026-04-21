'use client';
import { Suspense, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import {
  Clock,
  Search,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type EntryType = 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';

interface TimeEntry {
  id: string;
  type: EntryType;
  timestamp: string;
  status: string;
  employee: { id: string; fullName: string; employeeCode: string };
  company: { id: string; name: string };
}

interface TimeEntriesResponse {
  data: TimeEntry[];
  total: number;
  page: number;
  limit: number;
}

const TYPE_LABELS: Record<EntryType, { label: string; className: string }> = {
  CHECK_IN:    { label: 'Entrada',      className: 'bg-emerald-100 text-emerald-700' },
  CHECK_OUT:   { label: 'Salida',       className: 'bg-blue-100 text-blue-700' },
  BREAK_START: { label: 'Inicio pausa', className: 'bg-amber-100 text-amber-700' },
  BREAK_END:   { label: 'Fin pausa',    className: 'bg-amber-100 text-amber-700' },
};

function typeBadge(type: EntryType) {
  const cfg = TYPE_LABELS[type] ?? { label: type, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const LIMIT = 50;

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TimeEntriesPage() {
  return (
    <Suspense fallback={null}>
      <TimeEntriesPageInner />
    </Suspense>
  );
}

function TimeEntriesPageInner() {
  const globalFilters = useGlobalFilters();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<TimeEntriesResponse>({
    queryKey: ['superadmin-time-entries', page, ...globalFilters.queryKeyPart],
    queryFn: () =>
      api.get(`/superadmin/time-entries?page=${page}&limit=${LIMIT}`, { params: globalFilters.httpParams }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/superadmin/time-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      setDeleteTarget(null);
    },
  });

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} elemento${selected.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.delete(`/superadmin/time-entries/${id}`)));
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['superadmin-time-entries'] });
    } catch (e) {
      alert('Error al eliminar algunos elementos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.employee.fullName.toLowerCase().includes(q) ||
      e.company.name.toLowerCase().includes(q) ||
      e.employee.employeeCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-800">Fichajes</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {total} fichaje{total !== 1 ? 's' : ''} en total
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Buscar por empleado, empresa, código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando fichajes...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Clock size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {search ? 'No se encontraron fichajes con ese filtro' : 'No hay fichajes registrados aún'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header w-10">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={e => {
                        if (e.target.checked) setSelected(new Set(filtered.map(i => i.id)));
                        else setSelected(new Set());
                      }}
                    />
                  </th>
                  <th className="table-header">Empleado</th>
                  <th className="table-header">Empresa</th>
                  <th className="table-header">Tipo</th>
                  <th className="table-header">Fecha y hora</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header text-right pr-5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
                    <td className="table-cell w-10">
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
                    <td className="table-cell">
                      <div>
                        <p className="font-semibold text-brand-800">{entry.employee.fullName}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{entry.employee.employeeCode}</p>
                      </div>
                    </td>
                    <td className="table-cell text-slate-600">{entry.company.name}</td>
                    <td className="table-cell">{typeBadge(entry.type)}</td>
                    <td className="table-cell text-slate-600 text-sm tabular-nums">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="table-cell">
                      {entry.status === 'VALID' ? (
                        <span className="badge-accent">Válido</span>
                      ) : entry.status === 'PENDING' ? (
                        <span className="bg-amber-100 text-amber-700 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium">Pendiente</span>
                      ) : (
                        <span className="badge-red">{entry.status}</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setDeleteTarget(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Eliminar fichaje"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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
            Página {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); setSelected(new Set()); }}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setSelected(new Set()); }}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

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

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
          <div
            className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Eliminar fichaje</h3>
                <p className="text-xs text-slate-400 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              ¿Estás seguro de que quieres eliminar el fichaje de{' '}
              <strong className="text-slate-900">{deleteTarget.employee.fullName}</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-5">
              {typeBadge(deleteTarget.type)} &nbsp;·&nbsp; {formatTimestamp(deleteTarget.timestamp)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin" />Eliminando...</>
                ) : (
                  <><Trash2 size={14} />Eliminar fichaje</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
