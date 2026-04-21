'use client';
import { Suspense, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import Cookies from 'js-cookie';
import {
  Plus, Building2, MapPin, Users, Edit2, ToggleLeft,
  ToggleRight, Loader2, X, Check, Trash2, Download,
} from 'lucide-react';

interface WorkCenterForm {
  name: string;
  code: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  timezone: string;
  requireGps: boolean;
  allowRemote: boolean;
}

const EMPTY_FORM: WorkCenterForm = {
  name: '', code: '', address: '', city: '',
  latitude: '', longitude: '', radiusMeters: '200',
  timezone: 'Europe/Madrid', requireGps: true, allowRemote: false,
};

export default function WorkCentersPage() {
  return (
    <Suspense fallback={null}>
      <WorkCentersPageInner />
    </Suspense>
  );
}

function WorkCentersPageInner() {
  const globalFilters = useGlobalFilters();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [form, setForm]           = useState<WorkCenterForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [userRole, setUserRole]   = useState<string>('');
  const qc = useQueryClient();

  useEffect(() => {
    try {
      const u = JSON.parse(Cookies.get('user') ?? '{}');
      setUserRole(u.role ?? '');
    } catch { setUserRole(''); }
  }, []);

  const isReadOnly = userRole === 'HR';

  const handleExport = async () => {
    try {
      const res = await api.get('/work-centers/export/excel', { responseType: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([res.data]));
      link.download = 'centros_trabajo.xlsx';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert('Error al exportar los datos');
    }
  };

  const { data: centers, isLoading } = useQuery({
    queryKey: ['work-centers', ...globalFilters.queryKeyPart],
    queryFn: () => api.get('/work-centers', { params: globalFilters.httpParams }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api.patch(`/work-centers/${editing.id}`, payload)
        : api.post('/work-centers', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-centers'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.response?.data?.message ?? 'Error al guardar el centro de trabajo'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/work-centers/${id}`, { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-centers'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (center: any) => {
    setEditing(center);
    setForm({
      name: center.name, code: center.code ?? '', address: center.address ?? '',
      city: center.city ?? '', latitude: String(center.latitude ?? ''),
      longitude: String(center.longitude ?? ''), radiusMeters: String(center.radiusMeters ?? 200),
      timezone: center.timezone, requireGps: center.requireGps, allowRemote: center.allowRemote,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleBulkDelete = async () => {
    const msg = selected.size === 1
      ? `¿Eliminar ${selected.size} centro de trabajo?`
      : `¿Eliminar ${selected.size} centros de trabajo?`;
    if (!confirm(msg)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.delete(`/work-centers/${id}`)));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['work-centers'] });
    } catch (e) {
      alert('Error al eliminar los elementos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('El nombre es obligatorio'); return; }
    saveMutation.mutate({
      name: form.name,
      code: form.code || null,
      address: form.address || null,
      city: form.city || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      radiusMeters: parseInt(form.radiusMeters) || 200,
      timezone: form.timezone,
      requireGps: form.requireGps,
      allowRemote: form.allowRemote,
    });
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredCenters = (centers ?? []).filter((c: any) => {
    if (statusFilter === 'active')   return c.isActive;
    if (statusFilter === 'inactive') return !c.isActive;
    return true;
  });

  const activeCount   = (centers ?? []).filter((c: any) => c.isActive).length;
  const inactiveCount = (centers ?? []).filter((c: any) => !c.isActive).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centros de trabajo</h1>
          {centers && (
            <p className="text-sm text-gray-500 mt-0.5">
              {centers.length === 1 ? '1 centro de trabajo' : `${centers.length} centros de trabajo`}
              {isReadOnly && <span className="ml-2 text-amber-600 font-medium">Solo lectura</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-sm gap-1.5" title="Exportar">
            <Download size={14} /> Exportar
          </button>
          {!isReadOnly && (
            <button onClick={openCreate} className="btn-primary text-sm gap-1.5">
              <Plus size={15} /> Nuevo centro
            </button>
          )}
        </div>
      </div>

      {/* Tabs + bulk delete */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {([
          { key: 'all',      label: 'Todos',    count: centers?.length ?? 0 },
          { key: 'active',   label: 'Activos',  count: activeCount },
          { key: 'inactive', label: 'Inactivos', count: inactiveCount },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={
              statusFilter === tab.key
                ? 'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-500 text-white'
                : 'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }
          >
            {tab.label}
            <span className={statusFilter === tab.key
              ? 'text-xs px-1.5 py-0.5 rounded-md font-bold bg-white/20 text-white'
              : 'text-xs px-1.5 py-0.5 rounded-md font-bold bg-gray-100 text-gray-500'
            }>{tab.count}</span>
          </button>
        ))}
        {selected.size > 0 && !isReadOnly && (
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-60"
          >
            {bulkDeleting
              ? <><Loader2 size={13} className="animate-spin" />Eliminando...</>
              : <><Trash2 size={13} />Eliminar {selected.size}</>
            }
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card text-center py-16 text-gray-400">
          <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Cargando...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {!isReadOnly && (
                    <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        checked={filteredCenters.length > 0 && selected.size === filteredCenters.length}
                        onChange={e => {
                          if (e.target.checked) setSelected(new Set(filteredCenters.map((c: any) => c.id)));
                          else setSelected(new Set());
                        }}
                      />
                    </th>
                  )}
                  <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Centro</th>
                  <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Ubicación</th>
                  <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Empleados</th>
                  <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Opciones</th>
                  <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Estado</th>
                  {!isReadOnly && <th className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 text-left">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCenters.length === 0 ? (
                  <tr>
                    <td colSpan={isReadOnly ? 5 : 7} className="text-center py-16 text-gray-400">
                      <Building2 size={36} className="mx-auto mb-2 text-gray-200" />
                      No hay centros de trabajo
                    </td>
                  </tr>
                ) : (
                  filteredCenters.map((center: any) => (
                    <tr key={center.id} className="hover:bg-gray-50/60 transition-colors">
                      {!isReadOnly && (
                        <td className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                            checked={selected.has(center.id)}
                            onChange={e => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(center.id);
                              else next.delete(center.id);
                              setSelected(next);
                            }}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Building2 size={16} className="text-violet-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{center.name}</p>
                            {center.code && <span className="text-xs font-mono text-gray-400">{center.code}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {center.city
                          ? <div className="flex items-center gap-1.5"><MapPin size={12} className="text-gray-400 flex-shrink-0" />{center.address ? `${center.address}, ` : ''}{center.city}</div>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Users size={13} className="text-gray-400" />
                          {center._count?.employees ?? 0}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {center.requireGps && <span className="badge-blue">GPS</span>}
                          {center.allowRemote && <span className="badge-purple">Remoto</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={center.isActive ? 'badge-green' : 'badge-gray'}>
                          {center.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(center)}
                              className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => toggleMutation.mutate({ id: center.id, isActive: center.isActive })}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title={center.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {center.isActive
                                ? <ToggleRight size={16} className="text-emerald-500" />
                                : <ToggleLeft size={16} />
                              }
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="font-bold text-slate-900">
                {editing ? 'Editar centro de trabajo' : 'Nuevo centro de trabajo'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nombre *</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Sede central"
                  />
                </div>
                <div>
                  <label className="label">Código</label>
                  <input
                    className="input"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="HQ-01"
                  />
                </div>
                <div>
                  <label className="label">Ciudad</label>
                  <input
                    className="input"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Madrid"
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Dirección</label>
                  <input
                    className="input"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Calle Mayor, 1"
                  />
                </div>
                <div>
                  <label className="label">Latitud</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                    placeholder="40.416775"
                  />
                </div>
                <div>
                  <label className="label">Longitud</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                    placeholder="-3.703790"
                  />
                </div>
                <div>
                  <label className="label">Radio (metros)</label>
                  <input
                    className="input"
                    type="number"
                    value={form.radiusMeters}
                    onChange={(e) => setForm((f) => ({ ...f, radiusMeters: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Zona horaria</label>
                  <select
                    className="input"
                    value={form.timezone}
                    onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  >
                    <option value="Europe/Madrid">Europe/Madrid</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requireGps}
                    onChange={(e) => setForm((f) => ({ ...f, requireGps: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="text-sm text-slate-700">Requerir GPS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowRemote}
                    onChange={(e) => setForm((f) => ({ ...f, allowRemote: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="text-sm text-slate-700">Permitir remoto</span>
                </label>
              </div>

              {formError && (
                <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="btn-primary flex-1 gap-2"
                >
                  {saveMutation.isPending
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Check size={15} />
                  }
                  {editing ? 'Guardar' : 'Crear centro'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary px-6">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
