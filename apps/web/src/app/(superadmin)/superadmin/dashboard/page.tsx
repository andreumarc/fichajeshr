'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import {
  Building2,
  Users,
  Clock,
  TrendingUp,
  Plus,
  Eye,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Stats {
  companiesCount: number;
  activeCompanies: number;
  employeesCount: number;
  todayEntries: number;
}

interface Company {
  id: string;
  name: string;
  city?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  _count: { employees: number; workCenters: number; users: number };
}

interface CreateCompanyForm {
  name: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;
}

const emptyForm: CreateCompanyForm = {
  name: '',
  taxId: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'ES',
  timezone: 'Europe/Madrid',
  adminEmail: '',
  adminFirstName: '',
  adminLastName: '',
  adminPassword: '',
};

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  colorBg,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  colorBg: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${colorBg} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5" />
      <div className="absolute -right-1 -top-1 w-12 h-12 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{label}</p>
          <p className="text-3xl font-bold text-white mt-2 tabular-nums">
            {value ?? <span className="text-2xl opacity-40">—</span>}
          </p>
        </div>
        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon size={19} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function CreateCompanyModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateCompanyForm>(emptyForm);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: CreateCompanyForm) => {
      const payload: Record<string, string> = {
        name: data.name,
        country: data.country,
        timezone: data.timezone,
      };
      if (data.taxId)    payload.taxId   = data.taxId;
      if (data.email)    payload.email   = data.email;
      if (data.phone)    payload.phone   = data.phone;
      if (data.address)  payload.address = data.address;
      if (data.city)     payload.city    = data.city;
      if (data.adminEmail && data.adminPassword) {
        payload.adminEmail     = data.adminEmail;
        payload.adminFirstName = data.adminFirstName;
        payload.adminLastName  = data.adminLastName;
        payload.adminPassword  = data.adminPassword;
      }
      return api.post('/superadmin/companies', payload).then((r) => r.data);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setError('');
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message ?? 'Error al crear la empresa');
    },
  });

  const set = (field: keyof CreateCompanyForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-brand-800">Nueva Empresa</h2>
            <p className="text-xs text-slate-400 mt-0.5">Registrar una nueva empresa en la plataforma</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 text-xs font-bold">!</span>
              {error}
            </div>
          )}

          {/* Company fields */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Datos de la empresa
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nombre empresa *</label>
                <input className="input" placeholder="Acme Corp S.L." value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label className="label">NIF / CIF</label>
                <input className="input" placeholder="B12345678" value={form.taxId} onChange={set('taxId')} />
              </div>
              <div>
                <label className="label">Email de contacto</label>
                <input className="input" type="email" placeholder="info@empresa.com" value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" placeholder="+34 600 000 000" value={form.phone} onChange={set('phone')} />
              </div>
              <div>
                <label className="label">Ciudad</label>
                <input className="input" placeholder="Madrid" value={form.city} onChange={set('city')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Dirección</label>
                <input className="input" placeholder="Calle Gran Vía 1, 1ºA" value={form.address} onChange={set('address')} />
              </div>
              <div>
                <label className="label">País</label>
                <select className="input" value={form.country} onChange={set('country')}>
                  <option value="ES">España</option>
                  <option value="MX">México</option>
                  <option value="AR">Argentina</option>
                  <option value="CO">Colombia</option>
                  <option value="PE">Perú</option>
                  <option value="CL">Chile</option>
                  <option value="US">Estados Unidos</option>
                </select>
              </div>
              <div>
                <label className="label">Zona horaria</label>
                <select className="input" value={form.timezone} onChange={set('timezone')}>
                  <option value="Europe/Madrid">Europe/Madrid</option>
                  <option value="Atlantic/Canary">Atlantic/Canary</option>
                  <option value="America/Mexico_City">America/Mexico_City</option>
                  <option value="America/Buenos_Aires">America/Buenos_Aires</option>
                  <option value="America/Bogota">America/Bogota</option>
                  <option value="America/Lima">America/Lima</option>
                  <option value="America/Santiago">America/Santiago</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
            </div>
          </div>

          {/* Admin user fields */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Usuario Administrador
            </p>
            <p className="text-xs text-slate-400 mb-3">Opcional — se creará una cuenta de Administrador para esta empresa</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Email del administrador</label>
                <input className="input" type="email" placeholder="admin@empresa.com" value={form.adminEmail} onChange={set('adminEmail')} />
              </div>
              <div>
                <label className="label">Nombre</label>
                <input className="input" placeholder="María" value={form.adminFirstName} onChange={set('adminFirstName')} />
              </div>
              <div>
                <label className="label">Apellidos</label>
                <input className="input" placeholder="García López" value={form.adminLastName} onChange={set('adminLastName')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Contraseña</label>
                <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={form.adminPassword} onChange={set('adminPassword')} />
              </div>
            </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.name}
            className="btn-primary text-sm py-2 px-5"
          >
            {mutation.isPending ? (
              <><Loader2 size={14} className="animate-spin" />Creando...</>
            ) : (
              <>Crear empresa</>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

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

  const { data: stats, isLoading: loadingStats } = useQuery<Stats>({
    queryKey: ['superadmin-stats', dateFrom, dateTo, companyId, workCenterIds],
    queryFn: () => api.get('/superadmin/stats', { params: filterParams }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ['superadmin-companies', companyId],
    queryFn: () => api.get('/superadmin/companies', { params: companyId ? { company_id: companyId } : {} }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
  };

  const statCards = [
    { icon: Building2,  label: 'Total Empresas',    value: stats?.companiesCount,  colorBg: 'bg-brand-700' },
    { icon: CheckCircle2,label: 'Empresas Activas', value: stats?.activeCompanies,  colorBg: 'bg-accent-600' },
    { icon: Users,       label: 'Total Empleados',  value: stats?.employeesCount,   colorBg: 'bg-violet-600' },
    { icon: Clock,       label: 'Fichajes Hoy',     value: stats?.todayEntries,     colorBg: 'bg-sky-600' },
  ];

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-50 text-accent-700 rounded-full text-xs font-semibold ring-1 ring-accent-200 mb-2">
            <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse" />
            Panel de Control SaaS
          </div>
          <h1 className="text-2xl font-bold text-brand-800">Dashboard Maestro</h1>
          <p className="text-slate-500 text-sm mt-0.5">Vista global de todas las empresas en la plataforma</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary text-sm py-2.5 px-4"
        >
          <Plus size={15} />
          Nueva Empresa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} colorBg={s.colorBg} />
        ))}
      </div>

      {/* Companies table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-brand-800 text-sm">Empresas registradas</h2>
          <Link href="/superadmin/companies" className="text-xs text-accent-600 hover:text-accent-800 font-semibold flex items-center gap-1 transition-colors">
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>

        {loadingCompanies ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando empresas...</span>
          </div>
        ) : companies?.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay empresas registradas aún</p>
            <button onClick={() => setModalOpen(true)} className="mt-3 text-accent-600 text-xs font-semibold hover:underline">
              Crear la primera empresa
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header rounded-tl-none">Empresa</th>
                  <th className="table-header">Ciudad</th>
                  <th className="table-header">Empleados</th>
                  <th className="table-header">Centros</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header rounded-tr-none text-right pr-5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(companies ?? []).slice(0, 10).map((company, idx) => (
                  <tr key={company.id} className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="table-cell font-semibold text-brand-800">{company.name}</td>
                    <td className="table-cell text-slate-500">{company.city ?? '—'}</td>
                    <td className="table-cell tabular-nums">{company._count.employees}</td>
                    <td className="table-cell tabular-nums">{company._count.workCenters}</td>
                    <td className="table-cell">
                      {company.isActive ? (
                        <span className="badge-accent">Activa</span>
                      ) : (
                        <span className="badge-red">Inactiva</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <Link
                        href={`/superadmin/companies/${company.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                      >
                        <Eye size={13} />
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      <CreateCompanyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
