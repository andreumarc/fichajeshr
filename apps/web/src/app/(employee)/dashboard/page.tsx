'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ClockInButton } from '@/components/clock-in/ClockInButton';
import { Clock, History, AlertCircle, ChevronRight, CalendarDays, Info } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

export default function EmployeeDashboard() {
  const user = JSON.parse(Cookies.get('user') ?? '{}');

  const { data: statusData, refetch } = useQuery({
    queryKey: ['clock-status'],
    queryFn: () => api.get('/time-entries/status').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: summary } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () =>
      api.get(`/time-entries/daily-summary?date=${dayjs().format('YYYY-MM-DD')}`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: compliance } = useQuery({
    queryKey: ['my-compliance'],
    queryFn: () => api.get('/schedules/my/compliance').then((r) => r.data),
    refetchInterval: 300_000,
  });

  return (
    <div className="space-y-4">

      {/* Date strip */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 capitalize font-medium">
          {dayjs().format('dddd, D [de] MMMM')}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-accent-600 font-semibold bg-accent-50 px-2.5 py-1 rounded-full ring-1 ring-accent-200">
          <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse" />
          En vivo
        </div>
      </div>

      {/* Clock panel */}
      <div className="card shadow-brand-sm border-brand-50">
        <ClockInButton
          status={statusData?.status ?? 'NOT_CLOCKED_IN'}
          workCenterId={user.employee?.workCenterId}
          onSuccess={() => refetch()}
        />
      </div>

      {/* Daily summary */}
      {summary && (
        <div className="card animate-fade-in border-brand-50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
              <Clock size={14} className="text-brand-600" />
            </div>
            <h3 className="font-bold text-brand-800 text-sm">Resumen de hoy</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: `${summary.netWorkedHours ?? 0}h`,   label: 'Neto',   bg: 'bg-brand-700',  text: 'text-white', sub: 'text-brand-200' },
              { value: `${summary.totalBreakMinutes ?? 0}m`, label: 'Pausas', bg: 'bg-amber-500',  text: 'text-white', sub: 'text-amber-100' },
              { value: `${summary.totalWorkedHours ?? 0}h`,  label: 'Bruto',  bg: 'bg-accent-600',   text: 'text-white', sub: 'text-accent-100' },
            ].map(({ value, label, bg, text, sub }) => (
              <div key={label} className={`text-center p-3.5 ${bg} rounded-xl`}>
                <p className={`text-2xl font-bold ${text} tabular-nums`}>{value}</p>
                <p className={`text-xs ${sub} mt-0.5 font-semibold`}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mi horario hoy */}
      {compliance && (
        <div className="card animate-fade-in border-brand-50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
              <CalendarDays size={14} className="text-brand-600" />
            </div>
            <h3 className="font-bold text-brand-800 text-sm">Mi horario hoy</h3>
          </div>
          {!compliance.hasSchedule ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Info size={14} className="text-slate-400 flex-shrink-0" />
              Sin horario asignado. Contacta con RRHH.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{compliance.scheduleName}</span>
                <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold">{compliance.weeklyHours}h/sem</span>
              </div>
              {compliance.today?.isWorkDay ? (
                <div className="flex items-center gap-2 p-3 bg-brand-50 rounded-xl">
                  <Clock size={14} className="text-brand-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-brand-800">
                      {compliance.today.startTime} → {compliance.today.endTime}
                    </p>
                    {compliance.today.breakMinutes > 0 && (
                      <p className="text-xs text-slate-400">{compliance.today.breakMinutes} min descanso</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-400">Día de descanso</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/history',   icon: History,     label: 'Mi historial',  color: 'text-brand-600',  bg: 'bg-brand-50' },
          { href: '/incidents', icon: AlertCircle, label: 'Incidencias',   color: 'text-amber-600',  bg: 'bg-amber-50' },
        ].map(({ href, icon: Icon, label, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-center gap-3 hover:shadow-brand-md transition-all group border-brand-50"
          >
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
              <Icon size={16} className={color} />
            </div>
            <span className="font-semibold text-sm text-slate-700 flex-1">{label}</span>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}
