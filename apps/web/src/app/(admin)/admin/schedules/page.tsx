'use client';
import { Suspense, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import {
  Plus, Edit2, Trash2, Users, Clock, CalendarDays, X, AlertCircle, CheckCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type ScheduleType = 'MORNING' | 'AFTERNOON' | 'ROTATING' | 'SPLIT' | 'CUSTOM';
type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

interface DayConfig {
  dayOfWeek: DayOfWeek;
  isWorkDay: boolean;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  startTime2: string;
  endTime2: string;
}

interface WorkSchedule {
  id: string;
  name: string;
  type: ScheduleType;
  description?: string;
  weeklyHours: number;
  annualHours?: number;
  isActive: boolean;
  days: { dayOfWeek: DayOfWeek; isWorkDay: boolean; startTime?: string; endTime?: string; breakMinutes: number; startTime2?: string; endTime2?: string }[];
  _count?: { assignments: number };
}

interface Employee {
  id: string;
  fullName: string;
  employeeCode: string;
  department?: string;
  status: string;
  schedules: { startDate: string; schedule: WorkSchedule }[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'MONDAY',    label: 'Lunes',     short: 'L' },
  { key: 'TUESDAY',   label: 'Martes',    short: 'M' },
  { key: 'WEDNESDAY', label: 'Miércoles', short: 'X' },
  { key: 'THURSDAY',  label: 'Jueves',    short: 'J' },
  { key: 'FRIDAY',    label: 'Viernes',   short: 'V' },
  { key: 'SATURDAY',  label: 'Sábado',    short: 'S' },
  { key: 'SUNDAY',    label: 'Domingo',   short: 'D' },
];

const TYPE_LABELS: Record<ScheduleType, string> = {
  MORNING:   'Mañana',
  AFTERNOON: 'Tarde',
  ROTATING:  'Rotativo',
  SPLIT:     'Partido',
  CUSTOM:    'Personalizado',
};

const TYPE_BADGE_CLASS: Record<ScheduleType, string> = {
  MORNING:   'bg-blue-100 text-blue-700',
  AFTERNOON: 'bg-yellow-100 text-yellow-700',
  ROTATING:  'bg-purple-100 text-purple-700',
  SPLIT:     'bg-teal-100 text-teal-700',
  CUSTOM:    'bg-slate-100 text-slate-600',
};

// ── Default days builder ────────────────────────────────────────────────────────

function buildDefaultDays(type: ScheduleType): DayConfig[] {
  const workdays: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  return DAYS.map(({ key }) => {
    const isWork = workdays.includes(key);
    switch (type) {
      case 'MORNING':
        return { dayOfWeek: key, isWorkDay: isWork, startTime: isWork ? '09:00' : '', endTime: isWork ? '17:00' : '', breakMinutes: isWork ? 30 : 0, startTime2: '', endTime2: '' };
      case 'AFTERNOON':
        return { dayOfWeek: key, isWorkDay: isWork, startTime: isWork ? '14:00' : '', endTime: isWork ? '22:00' : '', breakMinutes: isWork ? 30 : 0, startTime2: '', endTime2: '' };
      case 'ROTATING':
        return { dayOfWeek: key, isWorkDay: isWork, startTime: isWork ? '09:00' : '', endTime: isWork ? '17:00' : '', breakMinutes: isWork ? 30 : 0, startTime2: '', endTime2: '' };
      case 'SPLIT':
        return { dayOfWeek: key, isWorkDay: isWork, startTime: isWork ? '09:00' : '', endTime: isWork ? '14:00' : '', breakMinutes: 0, startTime2: isWork ? '16:00' : '', endTime2: isWork ? '20:00' : '' };
      default:
        return { dayOfWeek: key, isWorkDay: isWork, startTime: '', endTime: '', breakMinutes: 0, startTime2: '', endTime2: '' };
    }
  });
}

// ── Schedule Modal ─────────────────────────────────────────────────────────────

function ScheduleModal({ schedule, onClose, onSaved }: { schedule?: WorkSchedule; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(schedule?.name ?? '');
  const [type, setType] = useState<ScheduleType>(schedule?.type ?? 'MORNING');
  const [description, setDescription] = useState(schedule?.description ?? '');
  const [weeklyHours, setWeeklyHours] = useState(schedule?.weeklyHours ?? 40);
  const [annualHours, setAnnualHours] = useState<number | ''>(schedule?.annualHours ?? '');
  const [days, setDays] = useState<DayConfig[]>(() => {
    if (schedule?.days?.length) {
      return DAYS.map(({ key }) => {
        const d = schedule.days.find((x) => x.dayOfWeek === key);
        return {
          dayOfWeek: key,
          isWorkDay: d?.isWorkDay ?? false,
          startTime: d?.startTime ?? '',
          endTime: d?.endTime ?? '',
          breakMinutes: d?.breakMinutes ?? 0,
          startTime2: d?.startTime2 ?? '',
          endTime2: d?.endTime2 ?? '',
        };
      });
    }
    return buildDefaultDays('MORNING');
  });
  const [error, setError] = useState('');

  // When type changes, rebuild defaults (only if creating new)
  const handleTypeChange = (t: ScheduleType) => {
    setType(t);
    if (!schedule) setDays(buildDefaultDays(t));
  };

  const updateDay = (idx: number, field: keyof DayConfig, value: any) => {
    setDays((prev) => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      schedule
        ? api.patch(`/schedules/${schedule.id}`, payload).then((r) => r.data)
        : api.post('/schedules', payload).then((r) => r.data),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error al guardar'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    mutation.mutate({ name, type, description: description || undefined, weeklyHours: Number(weeklyHours), annualHours: annualHours !== '' ? Number(annualHours) : undefined, days });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-brand-800 text-lg">
            {schedule ? 'Editar horario' : 'Nuevo horario'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Horario mañana estándar" required />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={type} onChange={(e) => handleTypeChange(e.target.value as ScheduleType)}>
                {(Object.entries(TYPE_LABELS) as [ScheduleType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Horas semanales</label>
              <input type="number" className="input" value={weeklyHours} onChange={(e) => setWeeklyHours(Number(e.target.value))} min={1} max={168} required />
            </div>
            <div>
              <label className="label">Tope horas anuales <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input type="number" className="input" value={annualHours} onChange={(e) => setAnnualHours(e.target.value === '' ? '' : Number(e.target.value))} placeholder="1826" min={0} />
            </div>
            <div className="col-span-2">
              <label className="label">Descripción <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del horario..." />
            </div>
          </div>

          {/* Days grid */}
          <div>
            <h3 className="font-semibold text-brand-800 text-sm mb-3">Configuración de días</h3>
            <div className="space-y-2">
              {days.map((day, idx) => {
                const dayInfo = DAYS[idx];
                return (
                  <div key={day.dayOfWeek} className={`rounded-xl border p-3 ${day.isWorkDay ? 'border-brand-100 bg-brand-50/40' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        id={`work-${day.dayOfWeek}`}
                        checked={day.isWorkDay}
                        onChange={(e) => updateDay(idx, 'isWorkDay', e.target.checked)}
                        className="w-4 h-4 accent-brand-700"
                      />
                      <label htmlFor={`work-${day.dayOfWeek}`} className="font-semibold text-sm text-brand-800 w-24">{dayInfo.label}</label>
                      {!day.isWorkDay && <span className="text-xs text-slate-400">Descanso</span>}
                    </div>
                    {day.isWorkDay && (
                      <div className="grid grid-cols-2 gap-3 ml-7">
                        <div className="flex items-center gap-2">
                          <div>
                            <label className="text-xs text-slate-500 mb-0.5 block">Entrada</label>
                            <input type="time" className="input py-1 text-sm" value={day.startTime} onChange={(e) => updateDay(idx, 'startTime', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-0.5 block">Salida</label>
                            <input type="time" className="input py-1 text-sm" value={day.endTime} onChange={(e) => updateDay(idx, 'endTime', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-0.5 block">Descanso (min)</label>
                            <input type="number" className="input py-1 text-sm w-20" value={day.breakMinutes} onChange={(e) => updateDay(idx, 'breakMinutes', Number(e.target.value))} min={0} max={120} />
                          </div>
                        </div>
                        {type === 'SPLIT' && (
                          <div className="flex items-center gap-2">
                            <div>
                              <label className="text-xs text-slate-500 mb-0.5 block">Entrada 2</label>
                              <input type="time" className="input py-1 text-sm" value={day.startTime2} onChange={(e) => updateDay(idx, 'startTime2', e.target.value)} />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-0.5 block">Salida 2</label>
                              <input type="time" className="input py-1 text-sm" value={day.endTime2} onChange={(e) => updateDay(idx, 'endTime2', e.target.value)} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleSubmit as any}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Guardando...' : schedule ? 'Actualizar' : 'Crear horario'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Modal ───────────────────────────────────────────────────────────────

function AssignModal({ employee, schedules, onClose, onSaved }: { employee: Employee; schedules: WorkSchedule[]; onClose: () => void; onSaved: () => void }) {
  const [scheduleId, setScheduleId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/schedules/employees/${employee.id}/assign`, { scheduleId, startDate, endDate: endDate || undefined }).then((r) => r.data),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error al asignar'),
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-brand-800">Asignar horario</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm"><AlertCircle size={15} />{error}</div>}
          <p className="text-sm text-slate-600">Empleado: <strong className="text-brand-800">{employee.fullName}</strong></p>
          <div>
            <label className="label">Horario</label>
            <select className="input" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} required>
              <option value="">Seleccionar horario...</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {TYPE_LABELS[s.type]} ({s.weeklyHours}h/sem)</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha inicio</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Fecha fin <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
        </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!scheduleId || mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  return (
    <Suspense fallback={null}>
      <SchedulesPageInner />
    </Suspense>
  );
}

function SchedulesPageInner() {
  const globalFilters = useGlobalFilters();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'templates' | 'assignments'>('templates');
  const [showModal, setShowModal] = useState(false);
  const [editSchedule, setEditSchedule] = useState<WorkSchedule | undefined>();
  const [assignEmployee, setAssignEmployee] = useState<Employee | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<WorkSchedule | undefined>();

  const { data: schedules = [], isLoading } = useQuery<WorkSchedule[]>({
    queryKey: ['schedules', ...globalFilters.queryKeyPart],
    queryFn: () => api.get('/schedules', { params: globalFilters.httpParams }).then((r) => r.data),
  });

  const { data: employees = [], isLoading: loadingEmps } = useQuery<Employee[]>({
    queryKey: ['schedules-employees-overview', ...globalFilters.queryKeyPart],
    queryFn: () => api.get('/schedules/employees-overview', { params: globalFilters.httpParams }).then((r) => r.data),
    enabled: tab === 'assignments',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); setConfirmDelete(undefined); },
  });

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ['schedules'] });
    qc.invalidateQueries({ queryKey: ['schedules-employees-overview'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Horarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de jornadas laborales y asignaciones</p>
        </div>
        <button
          onClick={() => { setEditSchedule(undefined); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nuevo horario
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['templates', 'assignments'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'templates' ? 'Plantillas' : 'Asignación empleados'}
          </button>
        ))}
      </div>

      {/* Tab: Plantillas */}
      {tab === 'templates' && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="card h-40 animate-pulse bg-slate-100" />)}
            </div>
          ) : schedules.length === 0 ? (
            <div className="card text-center py-16">
              <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500">Sin horarios creados</p>
              <p className="text-sm text-slate-400 mt-1">Crea tu primer horario para empezar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map((s) => {
                const workDays = s.days?.filter((d) => d.isWorkDay) ?? [];
                const workDayKeys = workDays.map((d) => d.dayOfWeek);
                return (
                  <div key={s.id} className="card hover:shadow-brand-md transition-all border-brand-50 group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${TYPE_BADGE_CLASS[s.type]}`}>
                          {TYPE_LABELS[s.type]}
                        </span>
                        <h3 className="font-bold text-brand-800 text-base leading-tight">{s.name}</h3>
                        {s.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.description}</p>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditSchedule(s); setShowModal(true); }} className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors">
                          <Edit2 size={14} className="text-brand-600" />
                        </button>
                        <button onClick={() => setConfirmDelete(s)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-brand-500" />
                        <span>{s.weeklyHours}h/sem</span>
                      </div>
                      {s.annualHours && (
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={13} className="text-brand-500" />
                          <span>{s.annualHours}h/año</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-brand-500" />
                        <span>{s._count?.assignments ?? 0} empl.</span>
                      </div>
                    </div>

                    {/* Day pills */}
                    <div className="flex gap-1">
                      {DAYS.map(({ key, short }) => (
                        <span
                          key={key}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${workDayKeys.includes(key) ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {short}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Asignación */}
      {tab === 'assignments' && (
        <div className="card p-0 overflow-hidden">
          {loadingEmps ? (
            <div className="p-8 text-center text-slate-400">Cargando empleados...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header">Empleado</th>
                    <th className="table-header">Código</th>
                    <th className="table-header">Dpto.</th>
                    <th className="table-header">Horario asignado</th>
                    <th className="table-header">Inicio asignación</th>
                    <th className="table-header">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const assignment = emp.schedules?.[0];
                    return (
                      <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="table-cell font-semibold text-brand-800">{emp.fullName}</td>
                        <td className="table-cell text-slate-500 font-mono text-xs">{emp.employeeCode}</td>
                        <td className="table-cell text-slate-500">{emp.department ?? '—'}</td>
                        <td className="table-cell">
                          {assignment ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE_CLASS[assignment.schedule.type]}`}>
                              {assignment.schedule.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs font-semibold">
                              <AlertCircle size={11} /> Sin horario
                            </span>
                          )}
                        </td>
                        <td className="table-cell text-slate-500 text-sm">
                          {assignment ? new Date(assignment.startDate).toLocaleDateString('es-ES') : '—'}
                        </td>
                        <td className="table-cell">
                          <button
                            onClick={() => setAssignEmployee(emp)}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Asignar horario
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schedule Create/Edit Modal */}
      {showModal && (
        <ScheduleModal
          schedule={editSchedule}
          onClose={() => { setShowModal(false); setEditSchedule(undefined); }}
          onSaved={handleSaved}
        />
      )}

      {/* Assign Modal */}
      {assignEmployee && (
        <AssignModal
          employee={assignEmployee}
          schedules={schedules}
          onClose={() => setAssignEmployee(undefined)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
          <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={() => setConfirmDelete(undefined)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-brand-800 mb-2">Eliminar horario</h3>
            <p className="text-sm text-slate-600 mb-5">¿Estás seguro de eliminar <strong>{confirmDelete.name}</strong>? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(undefined)} className="btn-secondary">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="btn-danger">
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
