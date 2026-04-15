'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, Globe, Clock,
  Users, UserPlus, Pencil, PowerOff, X, Loader2, Plus,
  Briefcase, CheckCircle2, XCircle, AlertTriangle,
  Upload, Download, FileSpreadsheet, Check,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompanyUser {
  id: string; email: string; firstName: string; lastName: string;
  role: string; isActive: boolean; createdAt: string;
}

interface CompanyEmployee {
  id: string; firstName: string; lastName: string; fullName: string;
  employeeCode: string; department?: string; position?: string;
  email?: string; weeklyHours?: number; status: string;
  workCenter?: { id: string; name: string };
  user?: { id: string; email: string; role: string };
}

interface WorkCenter { id: string; name: string; city?: string; }

interface CompanyDetail {
  id: string; name: string; taxId?: string; email?: string; phone?: string;
  address?: string; city?: string; country?: string; timezone?: string;
  isActive: boolean; createdAt: string;
  users: CompanyUser[];
  _count: { employees: number; workCenters: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    COMPANY_ADMIN: { cls: 'badge-blue',   label: 'Administrador' },
    HR:            { cls: 'badge-yellow', label: 'RRHH' },
    MANAGER:       { cls: 'badge-gray',   label: 'Responsable' },
    EMPLOYEE:      { cls: 'badge-gray',   label: 'Empleado' },
    SUPERADMIN:    { cls: 'badge-accent', label: 'SuperAdmin' },
  };
  const { cls, label } = map[role] ?? { cls: 'badge-gray', label: role };
  return <span className={cls}>{label}</span>;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-brand-600" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ── Edit Company Modal ─────────────────────────────────────────────────────────

function EditCompanyModal({ company, onClose, onSuccess }: { company: CompanyDetail; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: company.name, email: company.email ?? '', phone: company.phone ?? '', city: company.city ?? '', isActive: company.isActive });
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.patch(`/superadmin/companies/${company.id}`, form).then(r => r.data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error al actualizar'),
  });
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-brand-800">Editar Empresa</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"><X size={17} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm"><span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">!</span>{error}</div>}
          <div><label className="label">Nombre empresa *</label><input className="input" value={form.name} onChange={set('name')} /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
          <div><label className="label">Teléfono</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
          <div><label className="label">Ciudad</label><input className="input" value={form.city} onChange={set('city')} /></div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name} className="btn-primary text-sm py-2 px-5">
            {mutation.isPending ? <><Loader2 size={14} className="animate-spin" />Guardando...</> : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add User Modal ─────────────────────────────────────────────────────────────

function AddUserModal({ companyId, onClose, onSuccess }: { companyId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 'COMPANY_ADMIN', password: '' });
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post(`/superadmin/companies/${companyId}/users`, form).then(r => r.data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error al crear el usuario'),
  });
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-brand-800">Añadir Usuario</h2>
            <p className="text-xs text-slate-400 mt-0.5">Administrador o RRHH de esta empresa</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"><X size={17} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm"><span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">!</span>{error}</div>}
          <div><label className="label">Email *</label><input className="input" type="email" placeholder="usuario@empresa.com" value={form.email} onChange={set('email')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nombre *</label><input className="input" placeholder="María" value={form.firstName} onChange={set('firstName')} /></div>
            <div><label className="label">Apellidos *</label><input className="input" placeholder="García" value={form.lastName} onChange={set('lastName')} /></div>
          </div>
          <div>
            <label className="label">Rol *</label>
            <select className="input" value={form.role} onChange={set('role')}>
              <option value="COMPANY_ADMIN">Administrador</option>
              <option value="HR">RRHH</option>
            </select>
          </div>
          <div><label className="label">Contraseña *</label><input className="input" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} /></div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.email || !form.firstName || !form.password} className="btn-primary text-sm py-2 px-5">
            {mutation.isPending ? <><Loader2 size={14} className="animate-spin" />Creando...</> : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Employee Modal ─────────────────────────────────────────────────────────

function AddEmployeeModal({ companyId, onClose, onSuccess }: { companyId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', dni: '', phone: '',
    employeeCode: '', department: '', position: '', weeklyHours: 40,
    workCenterId: '', createUser: false, userPassword: '',
  });
  const [error, setError] = useState('');

  const { data: workCenters = [] } = useQuery<WorkCenter[]>({
    queryKey: ['superadmin-wc', companyId],
    queryFn: () => api.get(`/superadmin/companies/${companyId}/work-centers`).then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        firstName: form.firstName, lastName: form.lastName,
        employeeCode: form.employeeCode, weeklyHours: form.weeklyHours,
      };
      if (form.email) payload.email = form.email;
      if (form.dni) payload.dni = form.dni;
      if (form.phone) payload.phone = form.phone;
      if (form.department) payload.department = form.department;
      if (form.position) payload.position = form.position;
      if (form.workCenterId) payload.workCenterId = form.workCenterId;
      if (form.createUser && form.userPassword) {
        payload.createUser = true;
        payload.userPassword = form.userPassword;
      }
      return api.post(`/superadmin/companies/${companyId}/employees`, payload).then(r => r.data);
    },
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error al crear el empleado'),
  });

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const canSubmit = form.firstName && form.lastName && form.employeeCode;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-brand-800">Nuevo Empleado</h2>
            <p className="text-xs text-slate-400 mt-0.5">Dar de alta un empleado en esta empresa</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"><X size={17} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">
              <span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">!</span>
              {error}
            </div>
          )}

          {/* Datos personales */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Datos personales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Nombre *</label><input className="input" placeholder="Ana" value={form.firstName} onChange={set('firstName')} /></div>
              <div><label className="label">Apellidos *</label><input className="input" placeholder="García López" value={form.lastName} onChange={set('lastName')} /></div>
              <div><label className="label">DNI/NIE</label><input className="input" placeholder="12345678A" value={form.dni} onChange={set('dni')} /></div>
              <div><label className="label">Teléfono</label><input className="input" placeholder="+34 600 000 000" value={form.phone} onChange={set('phone')} /></div>
              <div className="sm:col-span-2"><label className="label">Email</label><input className="input" type="email" placeholder="ana@empresa.com" value={form.email} onChange={set('email')} /></div>
            </div>
          </div>

          {/* Datos laborales */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Datos laborales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Código empleado *</label><input className="input" placeholder="EMP-001" value={form.employeeCode} onChange={set('employeeCode')} /></div>
              <div>
                <label className="label">Horas semanales</label>
                <input className="input" type="number" min={0} max={60} value={form.weeklyHours} onChange={set('weeklyHours')} />
              </div>
              <div><label className="label">Departamento</label><input className="input" placeholder="Tecnología" value={form.department} onChange={set('department')} /></div>
              <div><label className="label">Puesto</label><input className="input" placeholder="Desarrollador" value={form.position} onChange={set('position')} /></div>
              <div className="sm:col-span-2">
                <label className="label">Centro de trabajo</label>
                <select className="input" value={form.workCenterId} onChange={set('workCenterId')}>
                  <option value="">Sin asignar</option>
                  {workCenters.map(wc => <option key={wc.id} value={wc.id}>{wc.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Acceso al sistema */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Acceso al sistema</p>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-brand-300 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-brand-600"
                checked={form.createUser}
                onChange={e => setForm(p => ({ ...p, createUser: e.target.checked }))}
              />
              <div>
                <p className="text-sm font-semibold text-slate-700">Crear cuenta de acceso</p>
                <p className="text-xs text-slate-400">El empleado podrá iniciar sesión con su email</p>
              </div>
            </label>

            {form.createUser && (
              <div className="mt-3">
                <label className="label">Contraseña *</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Contraseña de acceso"
                  value={form.userPassword}
                  onChange={set('userPassword')}
                />
                {!form.email && (
                  <p className="text-xs text-amber-600 mt-1.5">⚠ Introduce un email arriba para poder crear la cuenta</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
            className="btn-primary text-sm py-2 px-5"
          >
            {mutation.isPending ? <><Loader2 size={14} className="animate-spin" />Creando...</> : 'Crear empleado'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'employees'>('employees');
  const [deleteEmp, setDeleteEmp] = useState<CompanyEmployee | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: { row: number; message: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get(`/superadmin/companies/${id}/employees/import/template`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = 'plantilla_empleados.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Error al descargar la plantilla'); }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const res = await api.post(`/superadmin/companies/${id}/employees/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      qc.invalidateQueries({ queryKey: ['superadmin-company-employees', id] });
      qc.invalidateQueries({ queryKey: ['superadmin-company', id] });
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error al importar'); }
    finally { setImporting(false); }
  };

  const { data: company, isLoading, error } = useQuery<CompanyDetail>({
    queryKey: ['superadmin-company', id],
    queryFn: () => api.get(`/superadmin/companies/${id}`).then(r => r.data),
  });

  const { data: employees = [], isLoading: loadingEmps } = useQuery<CompanyEmployee[]>({
    queryKey: ['superadmin-company-employees', id],
    queryFn: () => api.get(`/superadmin/companies/${id}/employees`).then(r => r.data),
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/superadmin/users/${userId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin-company', id] }),
  });

  const deactivateEmpMutation = useMutation({
    mutationFn: (empId: string) => api.delete(`/superadmin/companies/${id}/employees/${empId}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin-company-employees', id] });
      qc.invalidateQueries({ queryKey: ['superadmin-company', id] });
    },
  });

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['superadmin-company', id] });
    qc.invalidateQueries({ queryKey: ['superadmin-company-employees', id] });
    qc.invalidateQueries({ queryKey: ['superadmin-companies'] });
    qc.invalidateQueries({ queryKey: ['superadmin-stats'] });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-32 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-sm">Cargando empresa...</span>
    </div>
  );

  if (error || !company) return (
    <div className="text-center py-32">
      <Building2 size={48} className="text-slate-200 mx-auto mb-4" />
      <p className="text-slate-500 text-sm mb-4">No se pudo cargar la empresa</p>
      <Link href="/superadmin/companies" className="btn-secondary text-sm py-2 px-4">Volver a empresas</Link>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Back + Header */}
      <div>
        <Link href="/superadmin/companies" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-600 font-medium transition-colors mb-4">
          <ArrowLeft size={14} />Volver a empresas
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-700 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-brand-800">{company.name}</h1>
                {company.isActive ? <span className="badge-accent">Activa</span> : <span className="badge-red">Inactiva</span>}
              </div>
              {company.taxId && <p className="text-sm text-slate-400 mt-0.5 font-mono">{company.taxId}</p>}
            </div>
          </div>
          <button onClick={() => setEditOpen(true)} className="btn-secondary text-sm py-2 px-4">
            <Pencil size={14} />Editar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left: Info + stats */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-brand-800 text-sm mb-3">Información</h2>
            <InfoRow icon={Mail}  label="Email"        value={company.email} />
            <InfoRow icon={Phone} label="Teléfono"     value={company.phone} />
            <InfoRow icon={MapPin} label="Ciudad"       value={company.city} />
            <InfoRow icon={Globe} label="País"         value={company.country} />
            <InfoRow icon={Clock} label="Zona horaria" value={company.timezone} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`card text-center cursor-pointer border-2 transition-colors ${activeTab === 'employees' ? 'border-brand-300' : 'border-transparent'}`} onClick={() => setActiveTab('employees')}>
              <p className="text-2xl font-bold text-brand-700 tabular-nums">{employees.length}</p>
              <p className="text-xs text-slate-400 mt-1">Empleados</p>
            </div>
            <div className={`card text-center cursor-pointer border-2 transition-colors ${activeTab === 'users' ? 'border-brand-300' : 'border-transparent'}`} onClick={() => setActiveTab('users')}>
              <p className="text-2xl font-bold text-brand-700 tabular-nums">{company.users.length}</p>
              <p className="text-xs text-slate-400 mt-1">Usuarios</p>
            </div>
          </div>
        </div>

        {/* Right: Tabbed section */}
        <div className="lg:col-span-3">

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'employees' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Briefcase size={13} className="inline mr-1.5" />Empleados
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'users' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users size={13} className="inline mr-1.5" />Usuarios del sistema
            </button>
          </div>

          {/* Employees tab */}
          {activeTab === 'employees' && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-2">
                <h2 className="font-semibold text-brand-800 text-sm flex items-center gap-2">
                  <Briefcase size={15} className="text-brand-600" />
                  Empleados ({employees.length})
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get(`/superadmin/companies/${id}/employees/export/excel`, { responseType: 'blob' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(new Blob([res.data]));
                        link.download = 'empleados.xlsx'; link.click();
                        URL.revokeObjectURL(link.href);
                      } catch { alert('Error al exportar'); }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Download size={12} />Exportar
                  </button>
                  <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Download size={12} />Plantilla
                  </button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {importing ? <><Loader2 size={12} className="animate-spin" />Importando...</> : <><Upload size={12} />Importar Excel</>}
                  </button>
                  <button
                    onClick={() => setAddEmpOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-600 hover:text-accent-800 bg-accent-50 hover:bg-accent-100 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Plus size={13} />Nuevo empleado
                  </button>
                </div>
              </div>

              {loadingEmps ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 size={16} className="animate-spin" /><span className="text-sm">Cargando...</span>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-16">
                  <Briefcase size={36} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No hay empleados en esta empresa</p>
                  <button onClick={() => setAddEmpOpen(true)} className="mt-3 text-accent-600 text-xs font-semibold hover:underline">
                    Añadir primer empleado
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Empleado</th>
                        <th className="table-header">Código</th>
                        <th className="table-header">Departamento</th>
                        <th className="table-header">Centro</th>
                        <th className="table-header">Cuenta</th>
                        <th className="table-header">Estado</th>
                        <th className="table-header text-right pr-5">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, idx) => (
                        <tr key={emp.id} className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                          <td className="table-cell">
                            <div>
                              <p className="font-semibold text-brand-800 text-sm">{emp.fullName}</p>
                              {emp.email && <p className="text-xs text-slate-400 font-mono">{emp.email}</p>}
                            </div>
                          </td>
                          <td className="table-cell font-mono text-xs text-slate-500">{emp.employeeCode}</td>
                          <td className="table-cell text-slate-500 text-sm">{emp.department ?? '—'}</td>
                          <td className="table-cell text-slate-500 text-sm">{emp.workCenter?.name ?? '—'}</td>
                          <td className="table-cell">
                            {emp.user
                              ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 size={12} />Tiene acceso</span>
                              : <span className="inline-flex items-center gap-1 text-xs text-slate-400"><XCircle size={12} />Sin cuenta</span>
                            }
                          </td>
                          <td className="table-cell">
                            {emp.status === 'ACTIVE'
                              ? <span className="badge-accent">Activo</span>
                              : <span className="badge-red">Inactivo</span>
                            }
                          </td>
                          <td className="table-cell text-right">
                            {emp.status === 'ACTIVE' && (
                              <button
                                onClick={() => setDeleteEmp(emp)}
                                disabled={deactivateEmpMutation.isPending}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Eliminar empleado"
                              >
                                <PowerOff size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Users tab */}
          {activeTab === 'users' && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-brand-800 text-sm flex items-center gap-2">
                  <Users size={15} className="text-brand-600" />
                  Usuarios del sistema ({company.users.length})
                </h2>
                <button
                  onClick={() => setAddUserOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-600 hover:text-accent-800 bg-accent-50 hover:bg-accent-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <UserPlus size={13} />Añadir usuario
                </button>
              </div>

              {company.users.length === 0 ? (
                <div className="text-center py-16">
                  <Users size={36} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No hay usuarios para esta empresa</p>
                  <button onClick={() => setAddUserOpen(true)} className="mt-3 text-accent-600 text-xs font-semibold hover:underline">Añadir primer usuario</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Nombre</th>
                        <th className="table-header">Email</th>
                        <th className="table-header">Rol</th>
                        <th className="table-header">Estado</th>
                        <th className="table-header text-right pr-5">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.users.map((user, idx) => (
                        <tr key={user.id} className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                          <td className="table-cell font-medium text-brand-800">{user.firstName} {user.lastName}</td>
                          <td className="table-cell text-slate-500 text-xs font-mono">{user.email}</td>
                          <td className="table-cell"><RoleBadge role={user.role} /></td>
                          <td className="table-cell">
                            {user.isActive ? <span className="badge-accent">Activo</span> : <span className="badge-red">Inactivo</span>}
                          </td>
                          <td className="table-cell text-right">
                            {user.isActive && (
                              <button
                                onClick={() => { if (confirm(`¿Desactivar a ${user.firstName} ${user.lastName}?`)) deactivateUserMutation.mutate(user.id); }}
                                disabled={deactivateUserMutation.isPending}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Desactivar usuario"
                              >
                                <PowerOff size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editOpen && <EditCompanyModal company={company} onClose={() => setEditOpen(false)} onSuccess={handleSuccess} />}
      {addUserOpen && <AddUserModal companyId={company.id} onClose={() => setAddUserOpen(false)} onSuccess={handleSuccess} />}
      {addEmpOpen && <AddEmployeeModal companyId={company.id} onClose={() => setAddEmpOpen(false)} onSuccess={handleSuccess} />}

      {/* Import result */}
      {importResult && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setImportResult(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-emerald-600" />
                </div>
                <h2 className="font-bold text-slate-900 text-sm">Resultado de la importación</h2>
              </div>
              <button onClick={() => setImportResult(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="px-6 py-4 grid grid-cols-3 gap-3 flex-shrink-0">
              <div className="text-center bg-emerald-50 rounded-xl py-3">
                <p className="text-2xl font-bold text-emerald-600">{importResult.created}</p>
                <p className="text-xs text-emerald-700 font-medium">Creados</p>
              </div>
              <div className="text-center bg-amber-50 rounded-xl py-3">
                <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                <p className="text-xs text-amber-700 font-medium">Omitidos</p>
              </div>
              <div className="text-center bg-slate-50 rounded-xl py-3">
                <p className="text-2xl font-bold text-slate-600">{importResult.created + importResult.skipped}</p>
                <p className="text-xs text-slate-500 font-medium">Total</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="px-6 pb-2 flex-1 overflow-y-auto space-y-1.5">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700"><strong>Fila {err.row}:</strong> {err.message}</p>
                  </div>
                ))}
              </div>
            )}
            {importResult.errors.length === 0 && (
              <div className="px-6 pb-4 flex-shrink-0">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <Check size={14} className="text-emerald-500" />
                  <p className="text-sm text-emerald-700 font-medium">¡Sin errores!</p>
                </div>
              </div>
            )}
            <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button onClick={() => setImportResult(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-xl text-sm transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete employee confirmation */}
      {deleteEmp && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
          <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={() => setDeleteEmp(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Eliminar empleado</h3>
                <p className="text-xs text-slate-400 mt-0.5">Esta acción desactivará el empleado</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              ¿Estás seguro de que quieres eliminar a <strong className="text-slate-900">{deleteEmp.fullName}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteEmp(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => { deactivateEmpMutation.mutate(deleteEmp.id); setDeleteEmp(null); }}
                disabled={deactivateEmpMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <PowerOff size={14} />Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
