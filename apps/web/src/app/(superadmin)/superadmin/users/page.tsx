'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  UserCog, Search, Loader2, ChevronDown, RotateCcw, ToggleLeft, ToggleRight,
  Copy, Check, Key, X,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Admin empresa',
  HR:            'RRHH',
  MANAGER:       'Manager',
  EMPLOYEE:      'Empleado',
  KIOSK:         'Kiosco',
};

const ROLE_BADGE: Record<string, string> = {
  COMPANY_ADMIN: 'bg-brand-100 text-brand-700',
  HR:            'bg-violet-100 text-violet-700',
  MANAGER:       'bg-amber-100 text-amber-700',
  EMPLOYEE:      'bg-slate-100 text-slate-600',
  KIOSK:         'bg-sky-100 text-sky-700',
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  company: { id: string; name: string } | null;
  employee: { id: string; fullName: string; employeeCode: string } | null;
}

/* ── Temp Password Modal ─────────────────────────────────────── */
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
          <p className="text-emerald-100 text-sm mt-1">Comparte estas credenciales con el usuario</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Usuario</p>
            <p className="font-semibold text-slate-900">{name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Email</p>
            <p className="font-medium text-slate-700">{email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Contraseña provisional</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <code className="flex-1 font-mono text-xl font-bold text-slate-900 tracking-widest">{password}</code>
              <button
                onClick={copy}
                className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700">
              ⚠️ Al iniciar sesión por primera vez se pedirá cambiar esta contraseña.
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

/* ── Main Page ───────────────────────────────────────────────── */
export default function UsersPage() {
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('');
  const [tempPwd, setTempPwd] = useState<{ name: string; email: string; password: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['superadmin-users'],
    queryFn: () => api.get('/superadmin/users').then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/superadmin/users?id=${id}`, { isActive }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin-users'] }),
  });

  const resetMutation = useMutation({
    mutationFn: (u: User) =>
      api.post(`/superadmin/employees/${u.employee?.id}/reset-user-password`).then(r => r.data),
    onSuccess: (data, u) => {
      setTempPwd({
        name: `${u.firstName} ${u.lastName}`,
        email: data.email,
        password: data.tempPassword,
      });
    },
  });

  const filtered = (users ?? []).filter(u => {
    const q = search.toLowerCase();
    const matchSearch =
      u.email.toLowerCase().includes(q) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      (u.company?.name ?? '').toLowerCase().includes(q);
    const matchRole = roleFilter ? u.role === roleFilter : true;
    return matchSearch && matchRole;
  });

  function fmt(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-800">Usuarios</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {users?.length ?? 0} usuario{(users?.length ?? 0) !== 1 ? 's' : ''} registrado{(users?.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por email, nombre, empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="input pr-10 appearance-none cursor-pointer"
            value={roleFilter}
            onChange={e => setRole(e.target.value)}
          >
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando usuarios...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <UserCog size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {search || roleFilter ? 'No se encontraron usuarios con ese filtro' : 'No hay usuarios registrados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Usuario</th>
                  <th className="table-header">Empresa</th>
                  <th className="table-header">Rol</th>
                  <th className="table-header">Último acceso</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header text-right pr-5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
                    <td className="table-cell">
                      <div>
                        <p className="font-semibold text-brand-800">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                      </div>
                    </td>
                    <td className="table-cell text-slate-600">{u.company?.name ?? '—'}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="table-cell text-slate-500 text-sm tabular-nums">{fmt(u.lastLogin)}</td>
                    <td className="table-cell">
                      {u.isActive
                        ? <span className="badge-accent">Activo</span>
                        : <span className="badge-red">Inactivo</span>
                      }
                      {u.mustChangePassword && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                          cambio pwd
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        {u.employee && (
                          <button
                            onClick={() => resetMutation.mutate(u)}
                            disabled={resetMutation.isPending}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30"
                            title="Restablecer contraseña"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                          disabled={toggleMutation.isPending}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${
                            u.isActive
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {u.isActive
                            ? <ToggleRight size={15} className="text-emerald-500" />
                            : <ToggleLeft size={15} />
                          }
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

      {tempPwd && (
        <TempPasswordModal
          name={tempPwd.name}
          email={tempPwd.email}
          password={tempPwd.password}
          onClose={() => setTempPwd(null)}
        />
      )}
    </div>
  );
}
