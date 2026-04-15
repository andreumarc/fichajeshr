'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, X, AlertCircle, CalendarOff } from 'lucide-react';

type LeaveType = 'VACATION' | 'PERSONAL_DAY' | 'OTHER';
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface LeaveRequest {
  id: string;
  type: LeaveType | 'SICK_LEAVE' | 'MATERNITY';
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  createdAt: string;
}

interface LeaveBalance {
  vacationDays: number;
  vacationUsed: number;
  personalDays: number;
  personalUsed: number;
}

const TYPE_LABELS: Record<string, string> = {
  VACATION:    'Vacaciones',
  PERSONAL_DAY: 'Asunto propio',
  SICK_LEAVE:  'Baja laboral',
  MATERNITY:   'Maternidad/Pat.',
  OTHER:       'Otro',
};

const TYPE_BADGE: Record<string, string> = {
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
  CANCELLED: 'bg-slate-100 text-slate-400',
};

function businessDays(start: string, end: string): number {
  if (!start || !end) return 0;
  let count = 0;
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── New Request Modal ─────────────────────────────────────────────────────────

function NewRequestModal({ balance, onClose, onSaved }: { balance?: LeaveBalance; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<LeaveType>('VACATION');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const days = useMemo(() => businessDays(startDate, endDate), [startDate, endDate]);

  const mutation = useMutation({
    mutationFn: () => api.post('/leave-requests', { type, startDate, endDate, reason: reason || undefined }).then((r) => r.data),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error al enviar la solicitud'),
  });

  // Check if employee has enough balance
  const balanceWarning = useMemo(() => {
    if (!balance || !days) return '';
    if (type === 'VACATION' && days > (balance.vacationDays - balance.vacationUsed)) {
      return `Solo tienes ${balance.vacationDays - balance.vacationUsed} días de vacaciones disponibles`;
    }
    if (type === 'PERSONAL_DAY' && days > (balance.personalDays - balance.personalUsed)) {
      return `Solo tienes ${balance.personalDays - balance.personalUsed} días de asuntos propios disponibles`;
    }
    return '';
  }, [balance, days, type]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-brand-800">Nueva solicitud de ausencia</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle size={15} />{error}
            </div>
          )}
          {balanceWarning && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-sm">
              <AlertCircle size={15} />{balanceWarning}
            </div>
          )}

          <div>
            <label className="label">Tipo de ausencia</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
              <option value="VACATION">Vacaciones</option>
              <option value="PERSONAL_DAY">Asunto propio</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha inicio</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Fecha fin</label>
              <input type="date" className="input" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>

          {days > 0 && (
            <div className="flex items-center justify-center gap-2 p-3 bg-brand-50 rounded-xl">
              <span className="text-2xl font-bold text-brand-700">{days}</span>
              <span className="text-sm font-medium text-brand-600">días laborables</span>
            </div>
          )}

          <div>
            <label className="label">Motivo / observaciones <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea
              className="input min-h-[80px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Añade un comentario si lo deseas..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!startDate || !endDate || days <= 0 || mutation.isPending}
            className="btn-primary flex-1"
          >
            {mutation.isPending ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EmployeeLeaveRequestsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: balance } = useQuery<LeaveBalance>({
    queryKey: ['my-leave-balance'],
    queryFn: () => api.get('/leave-requests/my/balance').then((r) => r.data),
  });

  const { data: requests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['my-leave-requests'],
    queryFn: () => api.get('/leave-requests/my').then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/leave-requests/my/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leave-requests'] }),
  });

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ['my-leave-requests'] });
    qc.invalidateQueries({ queryKey: ['my-leave-balance'] });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-800">Mis Ausencias</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Nueva solicitud
        </button>
      </div>

      {/* Balance pills */}
      {balance && (
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="w-2 h-2 bg-brand-600 rounded-full" />
            <div>
              <p className="text-xs font-bold text-brand-800">
                {Math.max(0, balance.vacationDays - balance.vacationUsed)}/{balance.vacationDays}
              </p>
              <p className="text-[10px] text-slate-400">Vacaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="w-2 h-2 bg-accent-500 rounded-full" />
            <div>
              <p className="text-xs font-bold text-brand-800">
                {Math.max(0, balance.personalDays - balance.personalUsed)}/{balance.personalDays}
              </p>
              <p className="text-[10px] text-slate-400">Asuntos propios</p>
            </div>
          </div>
        </div>
      )}

      {/* Requests list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarOff size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-500">Sin solicitudes</p>
          <p className="text-sm text-slate-400 mt-1">Pulsa "Nueva solicitud" para crear una.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="card border-brand-50 flex items-start gap-3">
              {/* Type badge */}
              <div className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${TYPE_BADGE[req.type]}`}>
                {TYPE_LABELS[req.type]}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-brand-800">
                    {fmt(req.startDate)} — {fmt(req.endDate)}
                  </p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{req.days} días laborables</span>
                  <span>·</span>
                  <span>Solicitado el {fmt(req.createdAt)}</span>
                </div>
                {req.reason && (
                  <p className="text-xs text-slate-500 mt-1.5 italic">"{req.reason}"</p>
                )}
              </div>

              {/* Cancel */}
              {req.status === 'PENDING' && (
                <button
                  onClick={() => cancelMutation.mutate(req.id)}
                  disabled={cancelMutation.isPending}
                  className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                >
                  Cancelar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <NewRequestModal
          balance={balance}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
