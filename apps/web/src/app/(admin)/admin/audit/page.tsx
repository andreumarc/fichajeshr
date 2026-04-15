'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import dayjs from 'dayjs';
import { ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

const ACTION_BADGE: Record<string, string> = {
  LOGIN: 'badge-green',
  LOGOUT: 'badge-gray',
  LOGIN_FAILED: 'badge-red',
  CLOCK_IN: 'badge-blue',
  CLOCK_OUT: 'badge-blue',
  BREAK_START: 'badge-yellow',
  BREAK_END: 'badge-yellow',
  MANUAL_EDIT: 'badge-purple',
  CREATE: 'badge-green',
  UPDATE: 'badge-blue',
  DELETE: 'badge-red',
  EXPORT: 'badge-gray',
  PASSWORD_RESET: 'badge-yellow',
  PIN_RESET: 'badge-yellow',
  PERMISSION_CHANGE: 'badge-purple',
  CONFIG_CHANGE: 'badge-purple',
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Inicio sesión', LOGOUT: 'Cierre sesión', LOGIN_FAILED: 'Login fallido',
  CLOCK_IN: 'Entrada', CLOCK_OUT: 'Salida', BREAK_START: 'Pausa',
  BREAK_END: 'Fin pausa', MANUAL_EDIT: 'Edición manual',
  CREATE: 'Creación', UPDATE: 'Actualización', DELETE: 'Borrado',
  EXPORT: 'Exportación', PASSWORD_RESET: 'Reset contraseña',
  PIN_RESET: 'Reset PIN', PERMISSION_CHANGE: 'Cambio permisos', CONFIG_CHANGE: 'Config.',
};

export default function AuditPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    from: dayjs().startOf('week').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
    page: 1,
    limit: 50,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () =>
      api.get('/audit', {
        params: {
          ...filters,
          action: filters.action || undefined,
          entityType: filters.entityType || undefined,
          from: `${filters.from}T00:00:00`,
          to: `${filters.to}T23:59:59`,
        },
      }).then((r) => r.data),
  });

  const totalPages = data ? Math.ceil((data.total ?? 0) / filters.limit) : 1;

  const columnHeaders = [
    t('timeEntries.date'),
    t('audit.action'),
    t('audit.entity'),
    t('audit.user'),
    'IP',
    t('audit.details'),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
          <ShieldCheck size={18} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('audit.title')}</h1>
          <p className="text-sm text-slate-500">{t('audit.subtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="label">{t('audit.action')}</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value, page: 1 }))}
              className="input text-sm"
            >
              <option value="">{t('common.all')}</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('audit.entity')}</label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value, page: 1 }))}
              className="input text-sm"
            >
              <option value="">{t('common.all')}</option>
              {['TimeEntry', 'Employee', 'WorkCenter', 'User', 'Incident', 'Company'].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('timeEntries.from')}</label>
            <input type="date" value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
              className="input text-sm" />
          </div>
          <div>
            <label className="label">{t('timeEntries.to')}</label>
            <input type="date" value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
              className="input text-sm" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100">
                {columnHeaders.map((h) => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">{t('common.loading')}</td>
                </tr>
              ) : (data?.data?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    {t('audit.noLogs')}
                  </td>
                </tr>
              ) : (
                data!.data.map((log: any) => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                    <td className="table-cell text-xs font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {dayjs(log.createdAt).format('DD/MM/YY HH:mm:ss')}
                    </td>
                    <td className="table-cell">
                      <span className={ACTION_BADGE[log.action] ?? 'badge-gray'}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {log.entityType}
                      </span>
                      {log.entityId && (
                        <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-[100px]">
                          {log.entityId.slice(-8)}
                        </p>
                      )}
                    </td>
                    <td className="table-cell text-xs text-slate-600">
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName}`
                        : log.userId
                        ? log.userId.slice(-8)
                        : '—'}
                    </td>
                    <td className="table-cell text-xs font-mono text-slate-400">
                      {log.ipAddress ?? '—'}
                    </td>
                    <td className="table-cell max-w-xs">
                      <p className="text-xs text-slate-600 truncate">
                        {log.description ?? '—'}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              {t('audit.pageOf', { page: filters.page, total: totalPages, count: data?.total })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 gap-1"
              >
                <ChevronLeft size={14} /> {t('common.previous')}
              </button>
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page >= totalPages}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 gap-1"
              >
                {t('common.next')} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
