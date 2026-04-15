'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Download,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
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

// ── Edit Modal ─────────────────────────────────────────────────────────────────

function EditCompanyModal({
  company,
  onClose,
  onSuccess,
}: {
  company: Company;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: company.name,
    email: company.email ?? '',
    city: company.city ?? '',
    isActive: company.isActive,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/superadmin/companies/${company.id}`, form).then((r) => r.data),
    onSuccess: () => {
      setError('');
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message ?? 'Error al actualizar la empresa');
    },
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-brand-800">Editar Empresa</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={17} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">
              <span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 text-[10px] font-bold mt-0.5">!</span>
              {error}
            </div>
          )}
          <div>
            <label className="label">Nombre empresa *</label>
            <input className="input" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Email de contacto</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input className="input" value={form.city} onChange={set('city')} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="input"
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === 'true' }))}
            >
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name}
            className="btn-primary text-sm py-2 px-5"
          >
            {mutation.isPending ? (
              <><Loader2 size={14} className="animate-spin" />Guardando...</>
            ) : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Modal ───────────────────────────────────────────────────────────────

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
      if (data.taxId)   payload.taxId   = data.taxId;
      if (data.email)   payload.email   = data.email;
      if (data.phone)   payload.phone   = data.phone;
      if (data.address) payload.address = data.address;
      if (data.city)    payload.city    = data.city;
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-brand-800">Nueva Empresa</h2>
            <p className="text-xs text-slate-400 mt-0.5">Registrar una nueva empresa en la plataforma</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={17} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 text-xs font-bold">!</span>
              {error}
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Datos de la empresa</p>
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
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Usuario Administrador</p>
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
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.name}
            className="btn-primary text-sm py-2 px-5"
          >
            {mutation.isPending ? (
              <><Loader2 size={14} className="animate-spin" />Creando...</>
            ) : 'Crear empresa'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ['superadmin-companies'],
    queryFn: () => api.get('/superadmin/companies').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/superadmin/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      setDeleteCompany(null);
    },
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
    queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} elemento${selected.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.delete(`/superadmin/companies/${id}`)));
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['superadmin-companies'] });
    } catch (e) {
      alert('Error al eliminar algunos elementos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const filtered = (companies ?? []).filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.taxId ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true : filter === 'active' ? c.isActive : !c.isActive;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Empresas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {companies?.length ?? 0} empresa{(companies?.length ?? 0) !== 1 ? 's' : ''} registrada{(companies?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await api.get('/superadmin/companies/export/excel', { responseType: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(new Blob([res.data]));
                link.download = 'empresas.xlsx';
                link.click();
                URL.revokeObjectURL(link.href);
              } catch { alert('Error al exportar'); }
            }}
            className="btn-secondary text-sm gap-1.5"
            title="Exportar listado de empresas a Excel"
          >
            <Download size={14} /> Exportar Excel
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary text-sm py-2.5 px-4 gap-1.5">
            <Plus size={15} />
            Nueva Empresa
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar empresa, ciudad, NIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="input pr-10 appearance-none cursor-pointer"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando empresas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {search || filter !== 'all' ? 'No se encontraron empresas con ese filtro' : 'No hay empresas registradas aún'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
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
                  <th className="table-header">Empresa</th>
                  <th className="table-header">NIF</th>
                  <th className="table-header">Ciudad</th>
                  <th className="table-header">Empleados</th>
                  <th className="table-header">Centros</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header text-right pr-5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company, idx) => (
                  <tr
                    key={company.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
                    <td className="table-cell w-10">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        checked={selected.has(company.id)}
                        onChange={e => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(company.id);
                          else next.delete(company.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td className="table-cell font-semibold text-brand-800">{company.name}</td>
                    <td className="table-cell text-slate-500 font-mono text-xs">{company.taxId ?? '—'}</td>
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
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/superadmin/companies/${company.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          onClick={() => setEditingCompany(company)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteCompany(company)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Eliminar empresa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
      <CreateCompanyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleSuccess}
      />

      {editingCompany && (
        <EditCompanyModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Delete company confirmation */}
      {deleteCompany && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
          <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={() => setDeleteCompany(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Eliminar empresa</h3>
                <p className="text-xs text-slate-400 mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              ¿Estás seguro de que quieres eliminar la empresa <strong className="text-slate-900">{deleteCompany.name}</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-5">
              Se desactivará la empresa y todos sus accesos. Los datos históricos se conservarán.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteCompany(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => deleteMutation.mutate(deleteCompany.id)}
                disabled={deleteMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteMutation.isPending ? <><Loader2 size={14} className="animate-spin" />Eliminando...</> : <><Trash2 size={14} />Eliminar empresa</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
