'use client';
import { Suspense, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useGlobalFilters } from '@/hooks/useGlobalFilters';
import {
  Users,
  Search,
  Trash2,
  Clock,
  Loader2,
  AlertTriangle,
  X,
  RotateCcw,
  Key,
  Copy,
  Check,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  employeeCode: string;
  department: string | null;
  position: string | null;
  status: string;
  company: { id: string; name: string };
  workCenter: { id: string; name: string } | null;
  user: { id: string; email: string } | null;
  _count: { timeEntries: number };
}

// ── Temp Password Modal ────────────────────────────────────────────────────────

function TempPasswordModal({ name, email, password, onClose }: {
  name: string; email: string; password: string; onClose: () => void;
}) {
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
          <h2 className="text-lg font-bold text-white">Contraseña restablecida</h2>
          <p className="text-emerald-100 text-sm mt-1">Comparte estas credenciales con el empleado</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Empleado</p>
            <p className="font-semibold text-slate-900">{name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Email (usuario)</p>
            <p className="font-medium text-slate-700">{email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Contraseña provisional</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <code className="flex-1 font-mono text-xl font-bold text-slate-900 tracking-widest">{password}</code>
              <button
                onClick={copy}
                className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
                title="Copiar contraseña"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700">
              ⚠️ Al iniciar sesión por primera vez se pedirá cambiar esta contraseña. Compártela de forma segura.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirmation Modal ─────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
  onClose,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-rose-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <div className="text-sm text-slate-600 mb-5">{description}</div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary" disabled={isPending}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" />Eliminando...</>
            ) : (
              <><Trash2 size={14} />{confirmLabel}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  return (
    <Suspense fallback={null}>
      <EmployeesPageInner />
    </Suspense>
  );
}

function EmployeesPageInner() {
  const globalFilters = useGlobalFilters();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleteEntriesTarget, setDeleteEntriesTarget] = useState<Employee | null>(null);
  const [resetPwdResult, setResetPwdResult] = useState<{ name: string; email: string; password: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['superadmin-employees', ...globalFilters.queryKeyPart],
    queryFn: () => api.get('/superadmin/employees', { params: globalFilters.httpParams }).then((r) => r.data),
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/superadmin/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-employees'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      setDeleteTarget(null);
    },
  });

  const deleteEntriesMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/superadmin/employees/${id}/time-entries`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-employees'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      setDeleteEntriesTarget(null);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (emp: Employee) =>
      api.post(`/superadmin/employees/${emp.id}/reset-user-password`).then(r => r.data),
    onSuccess: (data, emp) => {
      setResetPwdResult({
        name: emp.fullName,
        email: data.email,
        password: data.tempPassword,
      });
    },
  });

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} elemento${selected.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.delete(`/superadmin/employees/${id}`)));
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['superadmin-employees'] });
    } catch (e) {
      alert('Error al eliminar algunos elementos');
    } finally {
      setBulkDeleting(false);
    }
  };

  const filtered = (employees ?? []).filter((e) => {
    const q = search.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      (e.email ?? '').toLowerCase().includes(q) ||
      e.company.name.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Empleados</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {employees?.length ?? 0} empleado{(employees?.length ?? 0) !== 1 ? 's' : ''} registrado{(employees?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Buscar por nombre, email, empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando empleados...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {search ? 'No se encontraron empleados con ese filtro' : 'No hay empleados registrados aún'}
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
                  <th className="table-header">Empleado</th>
                  <th className="table-header">Empresa</th>
                  <th className="table-header">Código</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header text-center">Fichajes</th>
                  <th className="table-header text-right pr-5 w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
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
                      <div>
                        <p className="font-semibold text-brand-800">{emp.fullName}</p>
                        {emp.position && (
                          <p className="text-xs text-slate-400 mt-0.5">{emp.position}</p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-slate-600">{emp.company.name}</td>
                    <td className="table-cell font-mono text-xs text-slate-500">{emp.employeeCode}</td>
                    <td className="table-cell text-slate-500 text-sm">
                      {emp.user?.email ?? emp.email ?? '—'}
                    </td>
                    <td className="table-cell">
                      {emp.status === 'ACTIVE' ? (
                        <span className="badge-accent">Activo</span>
                      ) : (
                        <span className="badge-red">Inactivo</span>
                      )}
                    </td>
                    <td className="table-cell text-center tabular-nums">
                      {emp._count.timeEntries}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => resetPasswordMutation.mutate(emp)}
                          disabled={resetPasswordMutation.isPending || !emp.email}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={emp.email ? 'Restablecer contraseña' : 'Sin email — no tiene acceso web'}
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteEntriesTarget(emp)}
                          disabled={emp._count.timeEntries === 0}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Eliminar todos los fichajes"
                        >
                          <Clock size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Eliminar empleado"
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

      {/* Delete employee confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title="Eliminar empleado"
          description={
            <>
              <p className="mb-2">
                ¿Estás seguro de que quieres eliminar a{' '}
                <strong className="text-slate-900">{deleteTarget.fullName}</strong>?
              </p>
              <p className="text-xs text-slate-400">
                Se eliminarán también todos sus fichajes ({deleteTarget._count.timeEntries}).
              </p>
            </>
          }
          confirmLabel="Eliminar empleado"
          isPending={deleteEmployeeMutation.isPending}
          onConfirm={() => deleteEmployeeMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Delete time entries confirmation */}
      {deleteEntriesTarget && (
        <ConfirmModal
          title="Eliminar fichajes"
          description={
            <>
              <p className="mb-2">
                ¿Estás seguro de que quieres eliminar{' '}
                <strong className="text-slate-900">todos los fichajes</strong> de{' '}
                <strong className="text-slate-900">{deleteEntriesTarget.fullName}</strong>?
              </p>
              <p className="text-xs text-slate-400">
                Se eliminarán {deleteEntriesTarget._count.timeEntries} registro{deleteEntriesTarget._count.timeEntries !== 1 ? 's' : ''}. El empleado no se eliminará.
              </p>
            </>
          }
          confirmLabel="Eliminar fichajes"
          isPending={deleteEntriesMutation.isPending}
          onConfirm={() => deleteEntriesMutation.mutate(deleteEntriesTarget.id)}
          onClose={() => setDeleteEntriesTarget(null)}
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
    </div>
  );
}
