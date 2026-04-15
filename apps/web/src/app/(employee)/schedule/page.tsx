'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { Calendar, Clock, CalendarOff, ChevronRight, Info, Sun, Moon } from 'lucide-react';

type ScheduleType = 'MORNING' | 'AFTERNOON' | 'ROTATING' | 'SPLIT' | 'CUSTOM';
type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
type LeaveType = 'VACATION' | 'PERSONAL_DAY' | 'SICK_LEAVE' | 'MATERNITY' | 'OTHER';
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface ScheduleDay {
  dayOfWeek: DayOfWeek;
  isWorkDay: boolean;
  startTime?: string;
  endTime?: string;
  breakMinutes: number;
  startTime2?: string;
  endTime2?: string;
}

interface ScheduleAssignment {
  id: string;
  startDate: string;
  schedule: {
    name: string;
    type: ScheduleType;
    weeklyHours: number;
    annualHours?: number;
    days: ScheduleDay[];
  };
}

interface LeaveBalance {
  vacationDays: number;
  vacationUsed: number;
  personalDays: number;
  personalUsed: number;
}

interface LeaveRequest {
  id: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
}

const DAY_ORDER: DayOfWeek[] = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY:    'Lunes',
  TUESDAY:   'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY:  'Jueves',
  FRIDAY:    'Viernes',
  SATURDAY:  'Sábado',
  SUNDAY:    'Domingo',
};

const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY:    'Lun',
  TUESDAY:   'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY:  'Jue',
  FRIDAY:    'Vie',
  SATURDAY:  'Sáb',
  SUNDAY:    'Dom',
};

const TYPE_LABELS: Record<ScheduleType, string> = {
  MORNING:   'Mañana',
  AFTERNOON: 'Tarde',
  ROTATING:  'Rotativo',
  SPLIT:     'Partido',
  CUSTOM:    'Personalizado',
};

const TYPE_BADGE: Record<ScheduleType, string> = {
  MORNING:   'bg-blue-100 text-blue-700',
  AFTERNOON: 'bg-yellow-100 text-yellow-700',
  ROTATING:  'bg-purple-100 text-purple-700',
  SPLIT:     'bg-teal-100 text-teal-700',
  CUSTOM:    'bg-slate-100 text-slate-600',
};

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  VACATION:    'Vacaciones',
  PERSONAL_DAY: 'Asunto propio',
  SICK_LEAVE:  'Baja laboral',
  MATERNITY:   'Maternidad/Pat.',
  OTHER:       'Otro',
};

const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING:   'Pendiente',
  APPROVED:  'Aprobada',
  REJECTED:  'Rechazada',
  CANCELLED: 'Cancelada',
};

const LEAVE_STATUS_BADGE: Record<LeaveStatus, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
};

function getTodayDow(): DayOfWeek {
  const days: DayOfWeek[] = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  return days[new Date().getDay()];
}

function BalanceBar({ used, total, label, color }: { used: number; total: number; label: string; color: string }) {
  const pct = Math.min((used / total) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-brand-700">{used}/{total} días</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400 mt-1">{Math.max(0, total - used)} días restantes</p>
    </div>
  );
}

export default function SchedulePage() {
  const todayDow = getTodayDow();

  const { data: assignment, isLoading } = useQuery<ScheduleAssignment | null>({
    queryKey: ['my-schedule'],
    queryFn: () => api.get('/schedules/my').then((r) => r.data),
  });

  const { data: balance } = useQuery<LeaveBalance>({
    queryKey: ['my-leave-balance'],
    queryFn: () => api.get('/leave-requests/my/balance').then((r) => r.data),
  });

  const { data: myRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['my-leave-requests'],
    queryFn: () => api.get('/leave-requests/my').then((r) => r.data),
  });

  const recentRequests = myRequests.slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-brand-800">Mi Horario</h1>
        <div className="card text-center py-12">
          <Info size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600">Sin horario asignado</p>
          <p className="text-sm text-slate-400 mt-1">Contacta con RRHH para que te asignen un horario.</p>
        </div>
        <Link href="/leave-requests" className="card flex items-center gap-3 hover:shadow-brand-md transition-all group border-brand-50">
          <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <CalendarOff size={16} className="text-brand-600" />
          </div>
          <span className="font-semibold text-sm text-slate-700 flex-1">Solicitar ausencia</span>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-500 transition-all" />
        </Link>
      </div>
    );
  }

  const { schedule, startDate } = assignment;
  const orderedDays = DAY_ORDER.map((dow) => schedule.days.find((d) => d.dayOfWeek === dow)).filter(Boolean) as ScheduleDay[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-800">Mi Horario</h1>

      {/* Schedule info card */}
      <div className="card border-brand-50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${TYPE_BADGE[schedule.type]}`}>
              {TYPE_LABELS[schedule.type]}
            </span>
            <h2 className="font-bold text-brand-800 text-lg">{schedule.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Desde {new Date(startDate).toLocaleDateString('es-ES')}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-700">{schedule.weeklyHours}h</p>
            <p className="text-xs text-slate-400">por semana</p>
            {schedule.annualHours && (
              <>
                <p className="text-sm font-bold text-slate-600 mt-1">{schedule.annualHours}h</p>
                <p className="text-xs text-slate-400">tope anual</p>
              </>
            )}
          </div>
        </div>

        {/* Weekly grid */}
        <div className="space-y-2">
          {orderedDays.map((day) => {
            const isToday = day.dayOfWeek === todayDow;
            return (
              <div
                key={day.dayOfWeek}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                  isToday
                    ? 'bg-brand-700 text-white ring-2 ring-brand-500 shadow-md'
                    : day.isWorkDay
                    ? 'bg-slate-50 border border-slate-100'
                    : 'bg-slate-50/50 border border-slate-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-8 ${isToday ? 'text-white' : 'text-brand-700'}`}>
                    {DAY_SHORT[day.dayOfWeek]}
                  </span>
                  <span className={`text-xs font-medium ${isToday ? 'text-brand-100' : 'text-slate-500'}`}>
                    {DAY_LABELS[day.dayOfWeek]}
                  </span>
                </div>
                <div className="text-right">
                  {day.isWorkDay && day.startTime ? (
                    <div>
                      <span className={`text-sm font-bold ${isToday ? 'text-white' : 'text-brand-800'}`}>
                        {day.startTime} — {day.endTime}
                      </span>
                      {schedule.type === 'SPLIT' && day.startTime2 && (
                        <p className={`text-xs ${isToday ? 'text-brand-200' : 'text-slate-400'}`}>
                          {day.startTime2} — {day.endTime2}
                        </p>
                      )}
                      {day.breakMinutes > 0 && (
                        <p className={`text-xs ${isToday ? 'text-brand-200' : 'text-slate-400'}`}>
                          {day.breakMinutes} min descanso
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isToday ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      Descanso
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Balance */}
      {balance && (
        <div className="card border-brand-50">
          <h3 className="font-bold text-brand-800 text-sm mb-4">Balance anual {new Date().getFullYear()}</h3>
          <div className="space-y-4">
            <BalanceBar
              used={balance.vacationUsed}
              total={balance.vacationDays}
              label="Vacaciones"
              color="bg-brand-600"
            />
            <BalanceBar
              used={balance.personalUsed}
              total={balance.personalDays}
              label="Asuntos propios"
              color="bg-accent-500"
            />
          </div>
        </div>
      )}

      {/* Recent requests */}
      {recentRequests.length > 0 && (
        <div className="card border-brand-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-brand-800 text-sm">Últimas solicitudes</h3>
            <Link href="/leave-requests" className="text-xs text-brand-600 font-semibold hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-2">
            {recentRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-brand-800">{LEAVE_TYPE_LABELS[req.type]}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(req.startDate).toLocaleDateString('es-ES')} — {new Date(req.endDate).toLocaleDateString('es-ES')} · {req.days}d
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEAVE_STATUS_BADGE[req.status]}`}>
                  {LEAVE_STATUS_LABELS[req.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Link href="/leave-requests" className="card flex items-center gap-3 hover:shadow-brand-md transition-all group border-brand-50">
        <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <CalendarOff size={16} className="text-brand-600" />
        </div>
        <span className="font-semibold text-sm text-slate-700 flex-1">Solicitar ausencia</span>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-500 transition-all" />
      </Link>
    </div>
  );
}
