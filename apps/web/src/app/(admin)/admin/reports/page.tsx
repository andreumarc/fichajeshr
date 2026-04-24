'use client';
import { Suspense, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import { can } from '@/lib/permissions';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  Download, Calendar, BarChart3, Clock, Coffee,
  ChevronLeft, ChevronRight, TrendingUp, User,
} from 'lucide-react';

dayjs.locale('es');

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsPageInner />
    </Suspense>
  );
}

function ReportsPageInner() {
  const globalFilters = useGlobalFilters();
  const now = dayjs();
  const [year, setYear]  = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try { setRole(JSON.parse(Cookies.get('user') ?? '{}').role ?? null); } catch { setRole(null); }
  }, []);

  const canViewReports = can(role, 'reports:view');
  const canExportPayroll = can(role, 'payroll:export');

  const { data: employees } = useQuery({
    queryKey: ['employees-select', ...globalFilters.queryKeyPart],
    queryFn: () => api.get('/employees', { params: { ...globalFilters.httpParams, limit: 200 } }).then((r) => r.data.data),
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['monthly-report', year, month, selectedEmp, ...globalFilters.queryKeyPart],
    queryFn: () =>
      api.get('/reports/monthly-summary', {
        params: { ...globalFilters.httpParams, year, month, employeeId: selectedEmp || undefined },
      }).then((r) => r.data),
  });

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const from = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toISOString();
      const to   = dayjs(from).endOf('month').toISOString();
      const res  = await api.get('/reports/export-excel', {
        params: { from, to, employeeId: selectedEmp || undefined },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_${year}_${String(month).padStart(2, '0')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const monthLabel = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY');

  // Totals
  const totals = (report ?? []).reduce(
    (acc: any, row: any) => ({
      worked: acc.worked + (row.totalWorkedMinutes ?? 0),
      breaks: acc.breaks + (row.totalBreakMinutes ?? 0),
      days: acc.days + (row.workDays ?? 0),
    }),
    { worked: 0, breaks: 0, days: 0 },
  );

  if (role && !canViewReports) {
    return (
      <div className="card text-center py-12 text-sm text-slate-500">
        No tienes permiso para ver informes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Informes</h1>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">{monthLabel}</p>
        </div>
        {canExportPayroll && (
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="btn-secondary text-sm gap-2"
          >
            <Download size={15} className={exportLoading ? 'animate-pulse' : ''} />
            {exportLoading ? 'Generando...' : 'Exportar'}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          {/* Month nav */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft size={16} className="text-slate-600" />
            </button>
            <span className="font-semibold text-slate-800 min-w-[160px] text-center capitalize">
              {monthLabel}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>

          {/* Employee filter */}
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="input text-sm"
            >
              <option value="">Todos los empleados</option>
              {(employees ?? []).map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.employeeCode})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      {!isLoading && report && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Horas netas',
              value: `${(totals.worked / 60).toFixed(1)}h`,
              icon: Clock,
              color: 'from-indigo-500 to-indigo-700',
            },
            {
              label: 'Días trabajados',
              value: String(totals.days),
              icon: Calendar,
              color: 'from-emerald-500 to-emerald-700',
            },
            {
              label: 'Total pausas',
              value: `${Math.round(totals.breaks / 60 * 10) / 10}h`,
              icon: Coffee,
              color: 'from-amber-500 to-orange-600',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-white/70">{label}</p>
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon size={15} />
                </div>
              </div>
              <p className="text-3xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Employee breakdown table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <BarChart3 size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800 text-sm">Desglose por empleado</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100">
                {[
                  'Empleado',
                  'Días',
                  'Horas brutas',
                  'Total pausas',
                  'Horas netas',
                  'Media/día',
                ].map((h) => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">Cargando...</td>
                </tr>
              ) : (report ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Sin datos para este período
                  </td>
                </tr>
              ) : (
                (report as any[]).map((row: any) => {
                  const netHours   = (row.totalWorkedMinutes / 60).toFixed(2);
                  const breakHours = (row.totalBreakMinutes / 60).toFixed(1);
                  const grossHours = ((row.totalWorkedMinutes + row.totalBreakMinutes) / 60).toFixed(2);
                  const avgPerDay  = row.workDays > 0
                    ? `${(row.totalWorkedMinutes / row.workDays / 60).toFixed(1)}h`
                    : '—';

                  return (
                    <tr key={row.employee?.id ?? row.employee?.employeeCode} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {`${row.employee?.firstName?.[0] ?? ''}${row.employee?.lastName?.[0] ?? ''}`.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 leading-tight">
                              {row.employee?.firstName} {row.employee?.lastName}
                            </p>
                            <p className="text-xs text-slate-400">{row.employee?.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-semibold text-slate-700">{row.workDays}</td>
                      <td className="table-cell tabular-nums">{grossHours}h</td>
                      <td className="table-cell tabular-nums text-amber-600">{breakHours}h</td>
                      <td className="table-cell">
                        <span className="font-bold text-indigo-700 tabular-nums">{netHours}h</span>
                      </td>
                      <td className="table-cell text-slate-500">{avgPerDay}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
