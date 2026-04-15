'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import {
  Plus, Search, Key, QrCode, ChevronLeft, ChevronRight,
  Loader2, X, Users, Edit2, Trash2, RotateCcw, Copy, Check,
  Upload, Download, AlertTriangle, FileSpreadsheet,
} from 'lucide-react';
import '@/lib/i18n';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkCenter { id: string; name: string; }
interface Schedule   { id: string; name: string; type: string; weeklyHours: number; }

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

// ── New Employee Modal ─────────────────────────────────────────────────────────

const emptyForm = {
  firstName: '', lastName: '', email: '', dni: '', phone: '',
  employeeCode: '', department: '', position: '', weeklyHours: 40,
  workCenterId: '', pin: '',
  allowMobile: true, allowWeb: true, allowKiosk: true,
  createUser: false, userPassword: '',
  scheduleId: '', scheduleStartDate: new Date().toISOString().split('T')[0],
  portalRole: 'EMPLOYEE',
};

function NewEmployeeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [form, setForm]         = useState(emptyForm);
  const [error, setError]       = useState('');
  const [tempPwd, setTempPwd]   = useState<{ name: string; email: string; password: string } | null>(null);

  const { data: workCenters = [] } = useQuery<WorkCenter[]>({
    queryKey: ['work-centers-list'],
    queryFn: () => api.get('/work-centers').then(r => Array.isArray(r.data) ? r.data : r.data.data ?? []),
  });

  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: ['schedules-list'],
    queryFn: () => api.get('/schedules').then(r => Array.isArray(r.data) ? r.data : r.data.data ?? []),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        employeeCode: form.employeeCode,
        weeklyHours: Number(form.weeklyHours),
        allowMobile: form.allowMobile,
        allowWeb: form.allowWeb,
        allowKiosk: form.allowKiosk,
      };
      if (form.email)        payload.email        = form.email;
      if (form.email)        payload.portalRole   = form.portalRole;
      if (form.dni)          payload.dni          = form.dni;
      if (form.phone)        payload.phone        = form.phone;
      if (form.department)   payload.department   = form.department;
      if (form.position)     payload.position     = form.position;
      if (form.workCenterId) payload.workCenterId = form.workCenterId;
      if (form.pin)          payload.pin          = form.pin;
      const emp = await api.post('/employees', payload).then(r => r.data);
      // Assign schedule if selected
      if (form.scheduleId && emp.id) {
        await api.post(`/schedules/employees/${emp.id}/assign`, {
          scheduleId: form.scheduleId,
          startDate:  form.scheduleStartDate,
        }).catch(() => {}); // non-blocking: employee already created
      }
      return emp;
    },
    onSuccess: (emp) => {
      onSuccess();
      if (emp?.tempPassword && emp?.email) {
        setTempPwd({
          name: `${form.firstName} ${form.lastName}`,
          email: emp.email,
          password: emp.tempPassword,
        });
      } else {
        onClose();
      }
    },
    onError: (e: any) => setError(e.response?.data?.message ?? t('employees.saveError')),
  });

  const set = (f: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [f]: e.target.value }));

  const toggle = (f: 'allowMobile' | 'allowWeb' | 'allowKiosk' | 'createUser') =>
    setForm(p => ({ ...p, [f]: !p[f] }));

  const canSubmit = form.firstName.trim() && form.lastName.trim() && form.employeeCode.trim();

  return (
    <>
    {tempPwd && (
      <TempPasswordModal
        name={tempPwd.name}
        email={tempPwd.email}
        password={tempPwd.password}
        onClose={onClose}
      />
    )}
    {/* Overlay: scrollable so modal never goes off-screen */}
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 pt-24 pb-10">
        <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-2xl">
            <div>
              <h2 className="text-base font-bold text-brand-800">{t('employees.createTitle')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Completa los datos para dar de alta al empleado</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={17} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-6">
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">
                <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 text-xs font-bold mt-0.5">!</span>
                {error}
              </div>
            )}

            {/* Datos personales */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Datos personales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('employees.firstName')} *</label>
                  <input className="input" placeholder="Ana" value={form.firstName} onChange={set('firstName')} />
                </div>
                <div>
                  <label className="label">{t('employees.lastName')} *</label>
                  <input className="input" placeholder="García López" value={form.lastName} onChange={set('lastName')} />
                </div>
                <div>
                  <label className="label">{t('employees.dni')}</label>
                  <input className="input" placeholder="12345678A" value={form.dni} onChange={set('dni')} />
                </div>
                <div>
                  <label className="label">{t('employees.phone')}</label>
                  <input className="input" placeholder="+34 600 000 000" value={form.phone} onChange={set('phone')} />
                </div>
                <div className={form.email ? 'sm:col-span-1' : 'sm:col-span-2'}>
                  <label className="label">{t('employees.email')}</label>
                  <input className="input" type="email" placeholder="ana@empresa.com" value={form.email} onChange={set('email')} />
                </div>
                {form.email && (
                  <div>
                    <label className="label">Perfil de acceso al portal</label>
                    <select className="input" value={form.portalRole} onChange={set('portalRole')}>
                      <option value="EMPLOYEE">Empleado</option>
                      <option value="MANAGER">Responsable / Manager</option>
                      <option value="HR">RRHH</option>
                      <option value="COMPANY_ADMIN">Administrador</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">Nivel de acceso al panel de administración</p>
                  </div>
                )}
              </div>
            </div>

            {/* Datos laborales */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Datos laborales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('employees.employeeCode')} *</label>
                  <input className="input" placeholder="EMP-001" value={form.employeeCode} onChange={set('employeeCode')} />
                </div>
                <div>
                  <label className="label">{t('employees.weeklyHours')}</label>
                  <input className="input" type="number" min={0} max={60} value={form.weeklyHours} onChange={set('weeklyHours')} />
                </div>
                <div>
                  <label className="label">{t('employees.department')}</label>
                  <input className="input" placeholder="Tecnología" value={form.department} onChange={set('department')} />
                </div>
                <div>
                  <label className="label">{t('employees.position')}</label>
                  <input className="input" placeholder="Desarrollador" value={form.position} onChange={set('position')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">{t('employees.workCenter')}</label>
                  <select className="input" value={form.workCenterId} onChange={set('workCenterId')}>
                    <option value="">{t('common.none')}</option>
                    {workCenters.map((wc: WorkCenter) => (
                      <option key={wc.id} value={wc.id}>{wc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Horario de trabajo</label>
                  <select className="input" value={form.scheduleId} onChange={set('scheduleId')}>
                    <option value="">{t('common.none')}</option>
                    {schedules.map((s: Schedule) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.weeklyHours}h/sem
                      </option>
                    ))}
                  </select>
                </div>
                {form.scheduleId && (
                  <div>
                    <label className="label">Fecha inicio horario</label>
                    <input
                      className="input"
                      type="date"
                      value={form.scheduleStartDate}
                      onChange={set('scheduleStartDate')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Acceso */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Métodos de fichaje</p>
              <div className="flex flex-wrap gap-3">
                {([
                  { key: 'allowMobile', label: t('employees.allowMobile') },
                  { key: 'allowWeb',    label: t('employees.allowWeb') },
                  { key: 'allowKiosk',  label: t('employees.allowKiosk') },
                ] as const).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-slate-200 hover:border-brand-300 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-brand-600"
                      checked={form[key]}
                      onChange={() => toggle(key)}
                    />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <label className="label">{t('employees.pinOptional')}</label>
                <input
                  className="input"
                  type="text"
                  placeholder="4 dígitos, ej: 1234"
                  maxLength={8}
                  value={form.pin}
                  onChange={set('pin')}
                />
                <p className="text-xs text-slate-400 mt-1">Si se indica, el empleado podrá fichar con PIN en el kiosco</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">{t('common.cancel')}</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !canSubmit}
              className="btn-primary text-sm py-2 px-5"
            >
              {mutation.isPending
                ? <><Loader2 size={14} className="animate-spin" />Creando...</>
                : <>{t('employees.new')}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Temp Password Modal ────────────────────────────────────────────────────────

function TempPasswordModal({ name, email, password, onClose }: {
  name: string; email: string; password: string; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-emerald-500 px-6 py-5 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Key size={22} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Empleado creado</h2>
          <p className="text-emerald-100 text-sm mt-1">Se ha generado acceso al portal</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-slate-600">{t('employees.resetPasswordTitle')}</p>
            <p className="font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-400">{email}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <code className="flex-1 text-lg font-mono font-bold text-slate-800 tracking-widest text-center">
              {password}
            </code>
            <button onClick={copy} className="p-2 rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0">
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-500" />}
            </button>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
            <strong>Importante:</strong> {t('employees.resetPasswordDesc')}
          </div>
          <button onClick={onClose} className="btn-primary w-full">{t('common.confirm')}</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Employee Modal ────────────────────────────────────────────────────────

function EditEmployeeModal({ employee, onClose, onSuccess }: { employee: any; onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName:    employee.firstName   ?? '',
    lastName:     employee.lastName    ?? '',
    email:        employee.email       ?? '',
    dni:          employee.dni         ?? '',
    phone:        employee.phone       ?? '',
    department:   employee.department  ?? '',
    position:     employee.position    ?? '',
    weeklyHours:  employee.weeklyHours ?? 40,
    workCenterId: employee.workCenter?.id ?? '',
    allowMobile:  employee.allowMobile ?? true,
    allowWeb:     employee.allowWeb    ?? true,
    allowKiosk:   employee.allowKiosk  ?? true,
    status:       employee.status      ?? 'ACTIVE',
  });
  const [error, setError] = useState('');

  const { data: workCenters = [] } = useQuery<WorkCenter[]>({
    queryKey: ['work-centers-list'],
    queryFn: () => api.get('/work-centers').then(r => Array.isArray(r.data) ? r.data : r.data.data ?? []),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        firstName:   form.firstName,
        lastName:    form.lastName,
        weeklyHours: Number(form.weeklyHours),
        allowMobile: form.allowMobile,
        allowWeb:    form.allowWeb,
        allowKiosk:  form.allowKiosk,
        status:      form.status,
      };
      if (form.email)        payload.email        = form.email;
      if (form.dni)          payload.dni          = form.dni;
      if (form.phone)        payload.phone        = form.phone;
      if (form.department)   payload.department   = form.department;
      if (form.position)     payload.position     = form.position;
      if (form.workCenterId) payload.workCenterId = form.workCenterId;
      return api.patch(`/employees/${employee.id}`, payload).then(r => r.data);
    },
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? t('employees.saveError')),
  });

  const set = (f: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [f]: e.target.value }));

  const toggle = (f: 'allowMobile' | 'allowWeb' | 'allowKiosk') =>
    setForm(p => ({ ...p, [f]: !p[f] }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 pt-24 pb-10">
        <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-2xl">
            <div>
              <h2 className="text-base font-bold text-brand-800">{t('employees.editTitle')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{employee.firstName} {employee.lastName}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <X size={17} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-6">
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">
                <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">!</span>
                {error}
              </div>
            )}

            {/* Datos personales */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Datos personales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('employees.firstName')} *</label>
                  <input className="input" value={form.firstName} onChange={set('firstName')} />
                </div>
                <div>
                  <label className="label">{t('employees.lastName')} *</label>
                  <input className="input" value={form.lastName} onChange={set('lastName')} />
                </div>
                <div>
                  <label className="label">{t('employees.dni')}</label>
                  <input className="input" value={form.dni} onChange={set('dni')} />
                </div>
                <div>
                  <label className="label">{t('employees.phone')}</label>
                  <input className="input" value={form.phone} onChange={set('phone')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">{t('employees.email')}</label>
                  <input className="input" type="email" value={form.email} onChange={set('email')} />
                </div>
              </div>
            </div>

            {/* Datos laborales */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Datos laborales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('employees.weeklyHours')}</label>
                  <input className="input" type="number" min={0} max={60} value={form.weeklyHours} onChange={set('weeklyHours')} />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select className="input" value={form.status} onChange={set('status')}>
                    <option value="ACTIVE">{t('status.active')}</option>
                    <option value="INACTIVE">{t('status.inactive')}</option>
                    <option value="SUSPENDED">Suspendido</option>
                    <option value="ON_LEAVE">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('employees.department')}</label>
                  <input className="input" value={form.department} onChange={set('department')} />
                </div>
                <div>
                  <label className="label">{t('employees.position')}</label>
                  <input className="input" value={form.position} onChange={set('position')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">{t('employees.workCenter')}</label>
                  <select className="input" value={form.workCenterId} onChange={set('workCenterId')}>
                    <option value="">{t('common.none')}</option>
                    {workCenters.map((wc: WorkCenter) => (
                      <option key={wc.id} value={wc.id}>{wc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Métodos de fichaje */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Métodos de fichaje</p>
              <div className="flex flex-wrap gap-3">
                {([
                  { key: 'allowMobile', label: t('employees.allowMobile') },
                  { key: 'allowWeb',    label: t('employees.allowWeb') },
                  { key: 'allowKiosk',  label: t('employees.allowKiosk') },
                ] as const).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-slate-200 hover:border-brand-300 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-brand-600"
                      checked={form[key]}
                      onChange={() => toggle(key)}
                    />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">{t('common.cancel')}</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.firstName.trim() || !form.lastName.trim()}
              className="btn-primary text-sm py-2 px-5"
            >
              {mutation.isPending
                ? <><Loader2 size={14} className="animate-spin" />Guardando...</>
                : <>{t('common.save')}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Import Result Modal ────────────────────────────────────────────────────────

function ImportResultModal({
  result,
  onClose,
}: {
  result: { created: number; skipped: number; errors: { row: number; message: string }[] };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">{t('employees.importResult')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Resumen del proceso</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3 flex-shrink-0">
          <div className="text-center bg-emerald-50 rounded-xl py-3">
            <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
            <p className="text-xs text-emerald-700 mt-0.5 font-medium">Creados</p>
          </div>
          <div className="text-center bg-amber-50 rounded-xl py-3">
            <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
            <p className="text-xs text-amber-700 mt-0.5 font-medium">Omitidos</p>
          </div>
          <div className="text-center bg-slate-50 rounded-xl py-3">
            <p className="text-2xl font-bold text-slate-600">{result.created + result.skipped}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Total filas</p>
          </div>
        </div>

        {/* Errors list */}
        {result.errors.length > 0 && (
          <div className="px-6 pb-2 flex-1 overflow-y-auto">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              {t('employees.importErrors', { count: result.errors.length })}
            </p>
            <div className="space-y-1.5">
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-amber-700">{t('employees.importRow', { row: err.row })}: </span>
                    <span className="text-xs text-amber-700">{err.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.errors.length === 0 && (
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <Check size={15} className="text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">¡Importación completada sin errores!</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="btn-primary w-full">
            {t('employees.importClose')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { t } = useTranslation();
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editEmp, setEditEmp]       = useState<any>(null);
  const [deleteEmp, setDeleteEmp]   = useState<any>(null);
  const [resetPwdResult, setResetPwdResult] = useState<{ name: string; email: string; password: string } | null>(null);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: { row: number; message: string }[] } | null>(null);
  const [userRole, setUserRole]     = useState<string>('');
  const fileInputRef                = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    try {
      const u = JSON.parse(Cookies.get('user') ?? '{}');
      setUserRole(u.role ?? '');
    } catch { setUserRole(''); }
  }, []);

  const canImport = ['COMPANY_ADMIN', 'HR', 'SUPERADMIN'].includes(userRole);

  const downloadBlob = async (url: string, filename: string) => {
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([res.data]));
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert(t('common.exportError'));
    }
  };

  const handleDownloadTemplate = () => downloadBlob('/employees/import/template', t('employees.templateFile'));
  const handleExport           = () => downloadBlob('/employees/export/excel', t('employees.exportFile'));

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/employees/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      qc.invalidateQueries({ queryKey: ['employees'] });
    } catch (err: any) {
      alert(err.response?.data?.message ?? t('common.exportError'));
    } finally {
      setImporting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, page],
    queryFn: () => api.get('/employees', { params: { search, page, limit: 25 } }).then(r => r.data),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (emp: any) => api.post(`/employees/${emp.id}/reset-user-password`).then(r => r.data),
    onSuccess: (data, emp) => {
      setResetPwdResult({
        name: `${emp.firstName} ${emp.lastName}`,
        email: data.email,
        password: data.tempPassword,
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setDeleteEmp(null);
    },
  });

  const resetPin = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: string }) =>
      api.post(`/employees/${id}/reset-pin`, { pin }),
    onSuccess: () => alert('PIN actualizado correctamente'),
  });

  const generateQr = useMutation({
    mutationFn: (id: string) => api.post(`/employees/${id}/generate-qr`).then(r => r.data),
    onSuccess: (data) => {
      const win = window.open('', '_blank');
      win?.document.write(`
        <html><body style="text-align:center;font-family:sans-serif;padding:40px;background:#f8fafc">
          <div style="display:inline-block;padding:32px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
            <h2 style="margin:0 0 16px;color:#1e293b">${data.employeeName}</h2>
            <img src="${data.qrDataUrl}" style="max-width:280px;display:block;margin:0 auto"/>
            <p style="font-size:11px;color:#94a3b8;margin-top:12px;font-family:monospace">${data.token}</p>
          </div>
        </body></html>
      `);
    },
  });

  const handleBulkDelete = async () => {
    const msg = selected.size === 1
      ? t('common.deleteConfirm', { count: selected.size })
      : t('common.deleteConfirmPlural', { count: selected.size });
    if (!confirm(msg)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.delete(`/employees/${id}`)));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['employees'] });
    } catch (e) {
      alert(t('common.deleteError'));
    } finally {
      setBulkDeleting(false);
    }
  };

  const totalPages = Math.ceil((data?.total ?? 0) / 25);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('employees.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data ? t('employees.subtitle', { count: data.total }) : t('common.loading')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Exportar — visible para todos los perfiles del panel */}
          <button
            onClick={handleExport}
            className="btn-secondary text-sm gap-1.5"
            title={t('common.export')}
          >
            <Download size={14} /> {t('common.export')}
          </button>

          {/* Descargar plantilla de importación */}
          {canImport && (
            <button
              onClick={handleDownloadTemplate}
              className="btn-secondary text-sm gap-1.5"
              title={t('common.template')}
            >
              <FileSpreadsheet size={14} /> {t('common.template')}
            </button>
          )}

          {/* Importar — solo roles con permisos de creación */}
          {canImport && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="btn-secondary text-sm gap-1.5"
                title={t('common.import')}
              >
                {importing
                  ? <><Loader2 size={14} className="animate-spin" /> Importando...</>
                  : <><Upload size={14} /> {t('common.import')}</>
                }
              </button>
            </>
          )}

          <button className="btn-primary text-sm gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> {t('employees.new')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t('employees.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input pl-10 text-sm"
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    checked={(data?.data?.length ?? 0) > 0 && selected.size === (data?.data?.length ?? 0)}
                    onChange={e => {
                      if (e.target.checked) setSelected(new Set((data?.data ?? []).map((i: any) => i.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="table-header">{t('employees.title')}</th>
                <th className="table-header">{t('employees.employeeCode')}</th>
                <th className="table-header">{t('employees.department')}</th>
                <th className="table-header">{t('employees.workCenter')}</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acceso</th>
                <th className="table-header w-24">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                    {t('common.loading')}
                  </td>
                </tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20">
                    <div className="text-center">
                      <Users size={40} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">{t('common.noData')}</p>
                      <button
                        onClick={() => setModalOpen(true)}
                        className="mt-3 text-accent-600 text-xs font-semibold hover:underline"
                      >
                        {t('employees.new')}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                    <td className="table-cell w-10">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        checked={selected.has(emp.id)}
                        onChange={e => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(emp.id);
                          else next.delete(emp.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${emp.firstName} ${emp.lastName}`} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{emp.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                        {emp.employeeCode}
                      </span>
                    </td>
                    <td className="table-cell text-slate-600">{emp.department ?? '—'}</td>
                    <td className="table-cell text-slate-600">{emp.workCenter?.name ?? '—'}</td>
                    <td className="table-cell">
                      <span className={emp.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}>
                        {emp.status === 'ACTIVE' ? t('status.active') : t('status.inactive')}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {emp.allowMobile && <span className="badge-blue">{t('employees.allowMobile')}</span>}
                        {emp.allowWeb    && <span className="badge-blue">Web</span>}
                        {emp.allowKiosk  && <span className="badge-gray">{t('employees.allowKiosk')}</span>}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          title={t('common.edit')}
                          onClick={() => setEditEmp(emp)}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          title={t('employees.resetPassword')}
                          onClick={() => resetPasswordMutation.mutate(emp)}
                          disabled={resetPasswordMutation.isPending}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          title="Resetear PIN"
                          onClick={() => {
                            const pin = prompt('Nuevo PIN (4-8 dígitos):');
                            if (pin && pin.length >= 4) resetPin.mutate({ id: emp.id, pin });
                          }}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Key size={14} />
                        </button>
                        <button
                          title="Generar QR"
                          onClick={() => generateQr.mutate(emp.id)}
                          className="p-2 text-slate-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors"
                        >
                          <QrCode size={14} />
                        </button>
                        <button
                          title={t('common.delete')}
                          onClick={() => setDeleteEmp(emp)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              Página {page} {t('common.of')} {totalPages} · {data?.total} {t('employees.title').toLowerCase()}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => { setPage(p => p - 1); setSelected(new Set()); }} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5 gap-1">
                <ChevronLeft size={14} /> {t('common.previous')}
              </button>
              <button onClick={() => { setPage(p => p + 1); setSelected(new Set()); }} disabled={page >= totalPages} className="btn-secondary text-xs px-3 py-1.5 gap-1">
                {t('common.next')} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-brand-800 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-brand-900/40">
          <span className="text-sm font-semibold">
            {selected.size} {selected.size === 1 ? t('common.selected') : t('common.selectedPlural')}
          </span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            {t('common.deselectAll')}
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {bulkDeleting ? <><Loader2 size={13} className="animate-spin" />Eliminando...</> : <><Trash2 size={13} />{t('common.delete')} {selected.size}</>}
          </button>
        </div>
      )}

      {/* Import result modal */}
      {importResult && (
        <ImportResultModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}

      {/* New employee modal */}
      {modalOpen && (
        <NewEmployeeModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['employees'] });
            // Do NOT close modal here — NewEmployeeModal closes itself via onClose
            // (either directly when no tempPwd, or after TempPasswordModal is dismissed)
          }}
        />
      )}

      {/* Edit employee modal */}
      {editEmp && (
        <EditEmployeeModal
          employee={editEmp}
          onClose={() => setEditEmp(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['employees'] });
            setEditEmp(null);
          }}
        />
      )}

      {/* Reset password result */}
      {resetPwdResult && (
        <TempPasswordModal
          name={resetPwdResult.name}
          email={resetPwdResult.email}
          password={resetPwdResult.password}
          onClose={() => setResetPwdResult(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteEmp && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteEmp(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Dar de baja al empleado</h3>
                <p className="text-sm text-slate-500 mt-0.5">Esta acción desactivará su acceso</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              ¿Confirmas dar de baja a <strong>{deleteEmp.firstName} {deleteEmp.lastName}</strong>?
              El empleado quedará inactivo y no podrá fichar.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => deactivateMutation.mutate(deleteEmp.id)}
                disabled={deactivateMutation.isPending}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deactivateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                {t('common.confirm')}
              </button>
              <button onClick={() => setDeleteEmp(null)} className="btn-secondary px-5">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
