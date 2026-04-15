'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  LogIn, LogOut, Coffee, Play, AlertCircle, MapPin, MapPinOff,
  ChevronLeft, ChevronRight, Filter, Download,
} from 'lucide-react';

dayjs.locale('es');

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CHECK_IN:    { label: 'Entrada',    icon: LogIn,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
  CHECK_OUT:   { label: 'Salida',     icon: LogOut,      color: 'text-rose-600',    bg: 'bg-rose-50' },
  BREAK_START: { label: 'Pausa',      icon: Coffee,      color: 'text-amber-600',   bg: 'bg-amber-50' },
  BREAK_END:   { label: 'Fin pausa',  icon: Play,        color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  INCIDENT:    { label: 'Incidencia', icon: AlertCircle, color: 'text-slate-500',   bg: 'bg-slate-50' },
};

const STATUS_BADGE: Record<string, string> = {
  VALID:          'badge-green',
  OUT_OF_ZONE:    'badge-yellow',
  MANUAL:         'badge-blue',
  PENDING_REVIEW: 'badge-gray',
  APPROVED:       'badge-green',
  REJECTED:       'badge-red',
};

export default function HistoryPage() {
  const [filters, setFilters] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
    page: 1,
    limit: 30,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-history', filters],
    queryFn: () =>
      api.get('/time-entries/my', {
        params: { ...filters, from: `${filters.from}T00:00:00`, to: `${filters.to}T23:59:59` },
      }).then((r) => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / filters.limit) : 1;

  // Group entries by date
  const grouped = (data?.data ?? []).reduce((acc: Record<string, any[]>, entry: any) => {
    const day = dayjs(entry.timestamp).format('YYYY-MM-DD');
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Mi Historial</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">Desde</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">Hasta</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
                className="input text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats banner */}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{data.total}</p>
            <p className="text-xs text-slate-400 mt-0.5">Fichajes</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {Object.keys(grouped).length}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Días con actividad</p>
          </div>
        </div>
      )}

      {/* Entries grouped by day */}
      {isLoading ? (
        <div className="card text-center py-12 text-slate-400">Cargando historial…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          <History size={32} className="mx-auto mb-2 opacity-30" />
          No hay fichajes en este periodo
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([day, entries]) => {
            const dateLabel = dayjs(day).format('dddd, D [de] MMMM');
            return (
              <div key={day} className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide capitalize px-1">
                  {dateLabel}
                </p>
                <div className="card p-0 overflow-hidden divide-y divide-slate-50">
                  {(entries as any[]).map((entry: any) => {
                    const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.INCIDENT;
                    const Icon = cfg.icon;
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={16} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-800">{cfg.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400">
                              {dayjs(entry.timestamp).format('HH:mm:ss')}
                            </span>
                            {entry.workCenter?.name && (
                              <span className="text-xs text-slate-300">· {entry.workCenter.name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={STATUS_BADGE[entry.status] ?? 'badge-gray'}>
                            {entry.status === 'VALID' ? 'Válido' :
                             entry.status === 'OUT_OF_ZONE' ? 'Fuera zona' :
                             entry.status === 'MANUAL' ? 'Manual' : entry.status}
                          </span>
                          {entry.latitude && (
                            <span className={`flex items-center gap-0.5 text-xs ${entry.isWithinZone ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {entry.isWithinZone ? <MapPin size={11} /> : <MapPinOff size={11} />}
                              {entry.isWithinZone ? 'OK' : `${Math.round(entry.distanceToCenter ?? 0)}m`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            disabled={filters.page === 1}
            className="btn-secondary text-xs px-3 py-1.5 gap-1 disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="text-xs text-slate-500">
            Pág {filters.page} / {totalPages}
          </span>
          <button
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            disabled={filters.page >= totalPages}
            className="btn-secondary text-xs px-3 py-1.5 gap-1 disabled:opacity-40"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function History(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>;
}
