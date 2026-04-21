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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Centros de trabajo</h1>
          {centers && (
            <p className="text-sm text-slate-500 mt-0.5">
              {centers.length === 1
                ? '1 centro de trabajo'
                : `${centers.length} centros de trabajo`}
              {isReadOnly && <span className="ml-2 text-amber-600 font-medium">Solo lectura</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="btn-secondary text-sm gap-1.5"
            title="Exportar"
          >
            <Download size={14} /> Exportar
          </button>
          {!isReadOnly && (
            <button onClick={openCreate} className="btn-primary text-sm gap-1.5">
              <Plus size={15} /> Nuevo centro
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="card text-center py-16 text-slate-400">
          <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Cargando...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(centers ?? []).map((center: any) => (
            <div
              key={center.id}
              className={`card transition-all hover:shadow-md ${!center.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {!isReadOnly && (
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer flex-shrink-0"
                      checked={selected.has(center.id)}
                      onChange={e => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(center.id);
                        else next.delete(center.id);
                        setSelected(next);
                      }}
                    />
                  )}
                  <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                    <Building2 size={18} className="text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                      {center.name}
                    </h3>
                    {center.code && (
                      <span className="text-xs font-mono text-slate-400">{center.code}</span>
                    )}
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(center)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate({ id: center.id, isActive: center.isActive })}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {center.isActive
                        ? <ToggleRight size={16} className="text-emerald-500" />
                        : <ToggleLeft size={16} />
                      }
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {center.city && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={12} className="flex-shrink-0" />
                    {center.address ? `${center.address}, ` : ''}{center.city}
                  </div>
                )}
                {center.latitude && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium">GPS:</span>
                    {center.latitude.toFixed(6)}, {center.longitude?.toFixed(6)}
                    <span className="ml-auto text-indigo-600 font-medium">r={center.radiusMeters}m</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users size={13} />
                  <span>{center._count?.employees ?? 0} empleados</span>
                </div>
                <div className="flex gap-1">
                  {center.requireGps && <span className="badge-blue">GPS</span>}
                  {center.allowRemote && <span className="badge-purple">Remoto</span>}
                  <span className={center.isActive ? 'badge-green' : 'badge-gray'}>
                    {center.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk action bar — solo para roles con permisos de escritura */}
      {selected.size > 0 && !isReadOnly && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-brand-800 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-brand-900/40">
          <span className="text-sm font-semibold">
            {selected.size} {selected.size === 1 ? 'seleccionado' : 'seleccionados'}
          </span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Deseleccionar todo
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
