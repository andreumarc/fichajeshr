'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import {
  Users, Clock, Coffee, AlertCircle, MapPinOff,
  TrendingUp, UserCheck, UserX, ArrowRight, Building2, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/ca';
import 'dayjs/locale/en';

dayjs.locale('es');

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  color: 'navy' | 'teal' | 'amber' | 'slate' | 'rose' | 'orange' | 'violet' | 'sky';
  href?: string;
}

const COLOR_MAP: Record<StatCardProps['color'], { bg: string; iconBg: string; text: string; bar: string }> = {
  navy:   { bg: 'bg-brand-700',  iconBg: 'bg-white/15', text: 'text-brand-100',  bar: 'bg-brand-500' },
  teal:   { bg: 'bg-accent-600',   iconBg: 'bg-white/15', text: 'text-accent-100',   bar: 'bg-accent-400' },
  amber:  { bg: 'bg-amber-500',  iconBg: 'bg-white/15', text: 'text-amber-100',  bar: 'bg-amber-300' },
  slate:  { bg: 'bg-slate-600',  iconBg: 'bg-white/15', text: 'text-slate-100',  bar: 'bg-slate-400' },
  rose:   { bg: 'bg-rose-600',   iconBg: 'bg-white/15', text: 'text-rose-100',   bar: 'bg-rose-400' },
  orange: { bg: 'bg-orange-500', iconBg: 'bg-white/15', text: 'text-orange-100', bar: 'bg-orange-300' },
  violet: { bg: 'bg-violet-600', iconBg: 'bg-white/15', text: 'text-violet-100', bar: 'bg-violet-400' },
  sky:    { bg: 'bg-sky-600',    iconBg: 'bg-white/15', text: 'text-sky-100',    bar: 'bg-sky-400' },
};

function StatCard({ icon: Icon, label, value, color, href }: StatCardProps) {
  const c = COLOR_MAP[color];
  const inner = (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${c.bg} group transition-all duration-200 hover:shadow-brand-lg hover:-translate-y-0.5`}>
      {/* Decorative circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5" />
      <div className="absolute -right-1 -top-1 w-12 h-12 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${c.text} opacity-80`}>{label}</p>
          <p className="text-3xl font-bold text-white mt-2 tabular-nums">
            {value ?? <span className="text-2xl opacity-40">—</span>}
          </p>
        </div>
        <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={19} className="text-white" />
        </div>
      </div>

      {href && (
        <div className="relative mt-4 flex items-center gap-1 text-white/50 text-xs font-medium group-hover:text-white/80 transition-colors">
          Ver más <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function EmployeeRow({ emp, variant }: { emp: any; variant: 'working' | 'break' | 'absent' }) {
  const initials = emp.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const style = {
    working: { dot: 'bg-accent-500', avatar: 'bg-accent-50 text-accent-700', hover: 'hover:bg-accent-50/50' },
    break:   { dot: 'bg-amber-500', avatar: 'bg-amber-50 text-amber-700', hover: 'hover:bg-amber-50/50' },
    absent:  { dot: 'bg-slate-300', avatar: 'bg-slate-100 text-slate-500', hover: 'hover:bg-slate-50' },
  }[variant];

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${style.hover}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${style.avatar}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 leading-none truncate">{emp.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{emp.employeeCode}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        {variant !== 'absent' ? (
          <p className="text-xs text-slate-400 tabular-nums">
            {emp.lastEntryTime ? dayjs(emp.lastEntryTime).format('HH:mm') : '—'}
          </p>
        ) : (
          <span className="badge-gray">Sin fichar</span>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const dateFrom      = searchParams.get('date_from')       ?? '';
  const dateTo        = searchParams.get('date_to')         ?? '';
  const companyId     = searchParams.get('company_id')      ?? '';
  const workCenterIds = searchParams.get('work_center_ids') ?? '';

  const filterParams: Record<string, string> = {};
  if (dateFrom)      filterParams.date_from       = dateFrom;
  if (dateTo)        filterParams.date_to         = dateTo;
  if (companyId)     filterParams.company_id      = companyId;
  if (workCenterIds) filterParams.work_center_ids = workCenterIds;

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', dateFrom, dateTo, companyId, workCenterIds],
    queryFn: () => api.get('/reports/dashboard', { params: filterParams }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: todayStatus } = useQuery({
    queryKey: ['today-status', companyId, workCenterIds],
    queryFn: () => api.get('/employees/today-status', { params: filterParams }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const working = todayStatus?.filter((e: any) => e.status === 'WORKING')        ?? [];
  const onBreak = todayStatus?.filter((e: any) => e.status === 'ON_BREAK')       ?? [];
  const absent  = todayStatus?.filter((e: any) => e.status === 'NOT_CLOCKED_IN') ?? [];

  const statCards: StatCardProps[] = [
    { icon: Users,      label: 'Total empleados',    value: stats?.totalEmployees, color: 'navy',   href: '/admin/employees' },
    { icon: UserCheck,  label: 'Trabajando ahora',   value: stats?.clockedInNow,   color: 'teal' },
    { icon: Coffee,     label: 'En pausa',            value: stats?.onBreakNow,     color: 'amber' },
    { icon: UserX,      label: 'Sin fichar',          value: stats?.notClockedIn,   color: 'slate' },
    { icon: MapPinOff,  label: 'Fuera de zona hoy',  value: stats?.outOfZoneToday, color: 'orange' },
    { icon: AlertCircle,label: 'Incidencias abiertas',value: stats?.openIncidents,  color: 'rose',   href: '/admin/incidents' },
    { icon: TrendingUp, label: 'Fichajes esta semana',value: stats?.weeklyEntries,  color: 'violet' },
    { icon: Clock,      label: 'Activos hoy',         value: stats?.activeToday,    color: 'sky' },
  ];

  return (
    <div className="space-y-7">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Panel de control</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">
            {dayjs().format('dddd, D [de] MMMM [de] YYYY')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-50 text-accent-700 rounded-full text-xs font-semibold ring-1 ring-accent-200">
          <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse" />
          Tiempo real
        </div>
      </div>

      {/* ── Stats grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Employee status ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Working */}
        <div className="card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
            <h2 className="font-semibold text-brand-800 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
              Trabajando
            </h2>
            <span className="badge-accent">{working.length}</span>
          </div>
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {working.length === 0
              ? <p className="text-slate-400 text-sm text-center py-8">Nadie trabajando</p>
              : working.map((emp: any) => <EmployeeRow key={emp.id} emp={emp} variant="working" />)
            }
          </div>
        </div>

        {/* On break */}
        <div className="card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
            <h2 className="font-semibold text-brand-800 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
              En pausa
            </h2>
            <span className="badge-yellow">{onBreak.length}</span>
          </div>
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {onBreak.length === 0
              ? <p className="text-slate-400 text-sm text-center py-8">Nadie en pausa</p>
              : onBreak.map((emp: any) => <EmployeeRow key={emp.id} emp={emp} variant="break" />)
            }
          </div>
        </div>

        {/* Absent */}
        <div className="card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50">
            <h2 className="font-semibold text-brand-800 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-slate-300 rounded-full" />
              Sin fichar
            </h2>
            <span className="badge-gray">{absent.length}</span>
          </div>
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {absent.length === 0
              ? <p className="text-slate-400 text-sm text-center py-8">Todos han fichado</p>
              : absent.map((emp: any) => <EmployeeRow key={emp.id} emp={emp} variant="absent" />)
            }
          </div>
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Acceso rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Empleados',         href: '/admin/employees',    icon: Users,    color: 'text-brand-600',  bg: 'hover:bg-brand-50' },
            { label: 'Fichajes',          href: '/admin/time-entries', icon: Clock,    color: 'text-accent-600',   bg: 'hover:bg-accent-50' },
            { label: 'Centros de trabajo',href: '/admin/work-centers', icon: Building2,color: 'text-violet-600', bg: 'hover:bg-violet-50' },
            { label: 'Informes',          href: '/admin/reports',      icon: BarChart3,color: 'text-sky-600',    bg: 'hover:bg-sky-50' },
          ].map(({ label, href, icon: Icon, color, bg }) => (
            <Link
              key={label}
              href={href}
              className={`card flex items-center gap-3 font-semibold text-sm ${bg} transition-all hover:shadow-brand-md group border-brand-50`}
            >
              <div className={`w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon size={17} className={color} />
              </div>
              <span className="text-slate-700 flex-1">{label}</span>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
