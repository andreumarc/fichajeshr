'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Plus, X, AlertCircle, CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Calendar, User, FileText, Clock, Trash2, Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type LeaveType = 'VACATION' | 'PERSONAL_DAY' | 'SICK_LEAVE' | 'MATERNITY' | 'OTHER';
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface LeaveRequest {
  id: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  hrNotes?: string;
  createdAt: string;
  employee: { id: string; fullName: string; employeeCode: string; department?: string };
}

interface EmployeeOption {
  id: string;
  fullName: string;
  employeeCode: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<LeaveType, string> = {
  VACATION:    'Vacaciones',
  PERSONAL_DAY: 'Asunto propio',
  SICK_LEAVE:  'Baja laboral',
  MATERNITY:   'Maternidad/Paternidad',
  OTHER:       'Otro',
};

const TYPE_BADGE: Record<LeaveType, string> = {
  VACATION:    'bg-green-100 text-green-700',
  PERSONAL_DAY: 'bg-blue-100 text-blue-700',
  SICK_LEAVE:  'bg-red-100 text-red-700',
  MATERNITY:   'bg-purple-100 text-purple-700',
  OTHER:       'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING:   'Pendiente',
  APPROVED:  'Aprobada',
  REJECTED:  'Rechazada',
  CANCELLED: 'Cancelada',
};

const STATUS_BADGE: Record<LeaveStatus, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Sick Leave Modal ──────────────────────────────────────────────────────────

function SickLeaveModal({ employees, onClose, onSaved }: { employees: EmployeeOption[]; onClose: () => void; onSaved: () => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/leave-requests/sick-leave', { employeeId, startDate, endDate, reason: reason || undefined }).then((r) => r.data),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error al crear baja'),
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-brand-800">Nueva baja laboral</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm"><AlertCircle size={15} />{error}</div>}
          <div>
            <label className="label">Empleado</label>
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="">Seleccionar empleado...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha inicio</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Fecha fin</label>
              <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Motivo / diagnóstico <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea className="input min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descripción de la baja..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!employeeId || !startDate || !endDate || mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Creando...' : 'Registrar baja'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({ request, action, onClose, onSaved }: { request: LeaveRequest; action: 'approve' | 'reject'; onClose: () => void; onSaved: () => void }) {
  const [hrNotes, setHrNotes] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/leave-requests/${request.id}/review`, { action, hrNotes: hrNotes || undefined }).then((r) => r.data),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error al procesar'),
  });

  const isApprove = action === 'approve';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-brand-800">{isApprove ? 'Aprobar' : 'Rechazar'} solicitud</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm"><AlertCircle size={15} />{error}</div>}
          <div className={`p-4 rounded-xl ${isApprove ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            <p className="font-semibold text-sm text-brand-800">{request.employee.fullName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{TYPE_LABELS[request.type]} · {fmt(request.startDate)} — {fmt(request.endDate)} · {request.days} días</p>
            {request.reason && <p className="text-xs text-slate-500 mt-1 italic">"{request.reason}"</p>}
          </div>
          <div>
            <label className="label">Notas de RRHH <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea className="input min-h-[80px]" value={hrNotes} onChange={(e) => setHrNotes(e.target.value)} placeholder="Observaciones para el empleado..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={isApprove ? 'btn-primary' : 'btn-danger'}
          >
            {mutation.isPending ? 'Procesando...' : isApprove ? 'Aprobar' : 'Rechazar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

function CalendarTab({ requests }: { requests: LeaveRequest[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Build calendar grid (Mon-first)
  const startDow = (firstDay.getDay() + 6) % 7; // 0=Mon
  const totalDays = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');

  const getRequestsForDay = (day: number) => {
    const date = new Date(year, month, day);
    return approvedRequests.filter((r) => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return date >= start && date <= end;
    });
  };

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  return (
    <div className="card">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft size={16} className="text-slate-600" />
        </button>
        <h3 className="font-bold text-brand-800">{monthNames[month]} {year}</h3>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight size={16} className="text-slate-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="bg-slate-50 min-h-[80px]" />;
          const dayRequests = getRequestsForDay(day);
          const today = new Date();
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

          return (
            <div key={idx} className={`bg-white min-h-[80px] p-1.5 ${isToday ? 'ring-2 ring-inset ring-brand-300' : ''}`}>
              <span className={`text-xs font-bold block mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-700 text-white' : 'text-slate-600'}`}>
                {day}
              </span>
              <div className="space-y-0.5">
                {dayRequests.slice(0, 3).map((r) => (
                  <div key={r.id} className={`text-[10px] font-semibold px-1 py-0.5 rounded truncate ${TYPE_BADGE[r.type]}`}>
                    {r.employee.fullName.split(' ')[0]}
                  </div>
                ))}
                {dayRequests.length > 3 && (
                  <div className="text-[10px] text-slate-400 font-semibold">+{dayRequests.length - 3} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4">
        {(Object.entries(TYPE_LABELS) as [LeaveType, string][]).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${TYPE_BADGE[k]}`} />
            <span className="text-xs text-slate-500">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function LeaveRequestsAdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'requests' | 'sick' | 'calendar'>('requests');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [showSickModal, setShowSickModal] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ request: LeaveRequest; action: 'approve' | 'reject' } | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['leave-stats'],
    queryFn: () => api.get('/leave-requests/stats').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: requests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests-all'],
    queryFn: () => api.get('/leave-requests').then((r) => r.data),
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ['employees-list'],
    queryFn: () => api.get('/employees').then((r) => r.data?.data ?? r.data),
    enabled: showSickModal,
  });

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ['leave-requests-all'] });
    qc.invalidateQueries({ queryKey: ['leave-stats'] });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} elemento${selected.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.delete(`/leave-requests/${id}`)));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['leave-requests-all'] });
    } catch (e) {
      alert('Error al eliminar algunos elementos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    let r = requests;
    if (statusFilter !== 'ALL') r = r.filter((x) => x.status === statusFilter);
    if (search) r = r.filter((x) => x.employee.fullName.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [requests, statusFilter, search]);

  const sickLeaves = useMemo(() =>
    requests.filter((r) => r.type === 'SICK_LEAVE'),
    [requests]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Gestión de Ausencias</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control de solicitudes de ausencia y bajas laborales</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats pills */}
          {stats && (
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold ring-1 ring-amber-200">
                <Clock size={11} /> {stats.pending} pendientes
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold ring-1 ring-green-200">
                <CheckCircle size={11} /> {stats.approvedThisMonth} aprobadas
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold ring-1 ring-red-200">
                <AlertCircle size={11} /> {stats.sickLeaveActive} bajas activas
              </span>
            </div>
          )}
          <button onClick={() => setShowSickModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nueva baja laboral
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['requests', 'Solicitudes'], ['sick', 'Bajas laborales'], ['calendar', 'Calendario']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Solicitudes */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {s === 'ALL' ? 'Todas' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Buscar empleado..."
              className="input max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Cargando solicitudes...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-500">Sin solicitudes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
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
                      <th className="table-header">Tipo</th>
                      <th className="table-header">Período</th>
                      <th className="table-header">Días</th>
                      <th className="table-header">Motivo</th>
                      <th className="table-header">Estado</th>
                      <th className="table-header">Solicitud</th>
                      <th className="table-header">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((req) => (
                      <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="table-cell w-10">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                            checked={selected.has(req.id)}
                            onChange={e => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(req.id);
                              else next.delete(req.id);
                              setSelected(next);
                            }}
                          />
                        </td>
                        <td className="table-cell">
                          <div>
                            <p className="font-semibold text-brand-800 text-sm">{req.employee.fullName}</p>
                            <p className="text-xs text-slate-400">{req.employee.department ?? req.employee.employeeCode}</p>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[req.type]}`}>
                            {TYPE_LABELS[req.type]}
                          </span>
                        </td>
                        <td className="table-cell text-sm text-slate-600 whitespace-nowrap">
                          {fmt(req.startDate)} — {fmt(req.endDate)}
                        </td>
                        <td className="table-cell">
                          <span className="font-bold text-brand-700">{req.days}</span>
                        </td>
                        <td className="table-cell text-xs text-slate-500 max-w-[140px] truncate">
                          {req.reason ?? '—'}
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[req.status]}`}>
                            {STATUS_LABELS[req.status]}
                          </span>
                        </td>
                        <td className="table-cell text-xs text-slate-400 whitespace-nowrap">
                          {fmt(req.createdAt)}
                        </td>
                        <td className="table-cell">
                          {req.status === 'PENDING' ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => setReviewModal({ request: req, action: 'approve' })}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold transition-colors"
                              >
                                <CheckCircle size={12} /> Aprobar
                              </button>
                              <button
                                onClick={() => setReviewModal({ request: req, action: 'reject' })}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
                              >
                                <XCircle size={12} /> Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Bajas laborales */}
      {tab === 'sick' && (
        <div className="space-y-4">
          <div className="card p-0 overflow-hidden">
            {sickLeaves.length === 0 ? (
              <div className="p-12 text-center">
                <AlertCircle size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-500">Sin bajas laborales registradas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="table-header">Empleado</th>
                      <th className="table-header">Inicio</th>
                      <th className="table-header">Fin</th>
                      <th className="table-header">Días</th>
                      <th className="table-header">Motivo</th>
                      <th className="table-header">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sickLeaves.map((req) => {
                      const now = new Date();
                      const isActive = new Date(req.startDate) <= now && new Date(req.endDate) >= now && req.status === 'APPROVED';
                      return (
                        <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                          <td className="table-cell">
                            <div>
                              <p className="font-semibold text-brand-800 text-sm">{req.employee.fullName}</p>
                              <p className="text-xs text-slate-400">{req.employee.department ?? req.employee.employeeCode}</p>
                            </div>
                          </td>
                          <td className="table-cell text-sm text-slate-600">{fmt(req.startDate)}</td>
                          <td className="table-cell text-sm text-slate-600">{fmt(req.endDate)}</td>
                          <td className="table-cell font-bold text-brand-700">{req.days}</td>
                          <td className="table-cell text-xs text-slate-500 max-w-[160px] truncate">{req.reason ?? '—'}</td>
                          <td className="table-cell">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Activa
                              </span>
                            ) : (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[req.status]}`}>
                                {STATUS_LABELS[req.status]}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Calendario */}
      {tab === 'calendar' && <CalendarTab requests={requests} />}

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

      {/* Modals */}
      {showSickModal && (
        <SickLeaveModal
          employees={employees}
          onClose={() => setShowSickModal(false)}
          onSaved={handleSaved}
        />
      )}

      {reviewModal && (
        <ReviewModal
          request={reviewModal.request}
          action={reviewModal.action}
          onClose={() => setReviewModal(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
