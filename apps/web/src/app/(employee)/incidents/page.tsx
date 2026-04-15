'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { Plus, AlertCircle, CheckCircle2, Clock3, XCircle, Loader2 } from 'lucide-react';

dayjs.locale('es');

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  OPEN:       { label: 'Abierta',    cls: 'badge-yellow', icon: AlertCircle },
  IN_REVIEW:  { label: 'En revisión',cls: 'badge-blue',   icon: Clock3 },
  RESOLVED:   { label: 'Resuelta',   cls: 'badge-green',  icon: CheckCircle2 },
  REJECTED:   { label: 'Rechazada',  cls: 'badge-red',    icon: XCircle },
};

const INCIDENT_TYPES = [
  { value: 'MISSING_CHECK_IN',  label: 'Olvidé fichar entrada' },
  { value: 'MISSING_CHECK_OUT', label: 'Olvidé fichar salida' },
  { value: 'LATE_ARRIVAL',      label: 'Llegada tarde' },
  { value: 'EARLY_DEPARTURE',   label: 'Salida anticipada' },
  { value: 'OUT_OF_ZONE',       label: 'Fichaje fuera de zona' },
  { value: 'OTHER',             label: 'Otro' },
];

interface NewIncidentForm {
  type: string;
  description: string;
  occurredAt: string;
}

export default function EmployeeIncidentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewIncidentForm>({
    type: 'OTHER',
    description: '',
    occurredAt: dayjs().format('YYYY-MM-DDTHH:mm'),
  });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-incidents'],
    queryFn: () => api.get('/incidents/my', { params: { page: 1, limit: 50 } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/incidents/my', {
        type: form.type,
        description: form.description,
        occurredAt: new Date(form.occurredAt).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-incidents'] });
      setShowForm(false);
      setForm({ type: 'OTHER', description: '', occurredAt: dayjs().format('YYYY-MM-DDTHH:mm') });
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Mis Incidencias</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn-primary text-xs gap-1.5 px-3 py-2"
        >
          <Plus size={14} /> Nueva
        </button>
      </div>

      {/* New incident form */}
      {showForm && (
        <div className="card space-y-4 animate-fade-in border-indigo-100 ring-1 ring-indigo-200">
          <h3 className="font-semibold text-slate-800 text-sm">Reportar incidencia</h3>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="input text-sm"
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Fecha y hora</label>
            <input
              type="datetime-local"
              value={form.occurredAt}
              onChange={(e) => setForm((f) => ({ ...f, occurredAt: e.target.value }))}
              className="input text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe lo que ocurrió..."
              rows={3}
              className="input text-sm resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.description.trim() || createMutation.isPending}
              className="btn-primary flex-1 text-sm py-2.5 gap-2"
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Enviar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary text-sm px-4 py-2.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Incident list */}
      {isLoading ? (
        <div className="card text-center py-12 text-slate-400">Cargando…</div>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <div className="card text-center py-12 text-slate-400">
          <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
          No tienes incidencias
        </div>
      ) : (
        <div className="space-y-3">
          {data!.data.map((inc: any) => {
            const cfg = STATUS_CONFIG[inc.status] ?? STATUS_CONFIG.OPEN;
            const StatusIcon = cfg.icon;
            return (
              <div key={inc.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <StatusIcon size={16} className="flex-shrink-0 text-slate-500" />
                    <p className="font-medium text-sm text-slate-800 truncate">
                      {INCIDENT_TYPES.find((t) => t.value === inc.type)?.label ?? inc.type}
                    </p>
                  </div>
                  <span className={cfg.cls}>{cfg.label}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{inc.description}</p>
                {inc.resolution && (
                  <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-700">
                    <span className="font-medium">Resolución: </span>{inc.resolution}
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  {dayjs(inc.occurredAt).format('DD/MM/YYYY HH:mm')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
