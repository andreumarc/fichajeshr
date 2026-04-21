'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import Cookies from 'js-cookie';

/* ─── Types ──────────────────────────────────────────────────────── */
interface ProfileUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: { id: string; name: string };
  workCenter?: { id: string; name: string };
}

/* ─── Design tokens ──────────────────────────────────────────────── */
const BRAND = '#6366f1';

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Admin empresa',
  HR:            'RRHH',
  MANAGER:       'Manager',
  EMPLOYEE:      'Empleado',
  KIOSK:         'Kiosco',
  SUPERADMIN:    'Super Admin',
};

/* ─── Apps hardcoded ─────────────────────────────────────────────── */
const IMPULSODENT_APPS = [
  { name: 'ImpulsoDent Hub', desc: 'Panel central de gestión', color: '#003A70', href: 'https://app.impulsodent.com' },
  { name: 'ClinicVox', desc: 'Automatización de llamadas', color: '#0d9488' },
  { name: 'DentalHR', desc: 'Recursos humanos dental', color: '#003A70' },
  { name: 'Fichaje SaaS', desc: 'Control horario', color: '#6366f1' },
  { name: 'SpendFlow', desc: 'Gestión de gastos', color: '#d97706' },
  { name: 'Nexora', desc: 'Comunicación interna', color: '#2563eb' },
  { name: 'ClinicRefunds', desc: 'Devoluciones', color: '#dc2626' },
  { name: 'ClinicStock', desc: 'Gestión de stock', color: '#7c3aed' },
];

const TABS = ['Datos', 'Contraseña', 'Clínicas', 'Empresa', 'Aplicaciones'] as const;
type Tab = typeof TABS[number];

/* ─── Tab: Datos ─────────────────────────────────────────────────── */
function TabDatos({ user }: { user: ProfileUser }) {
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.patch('/auth/me', { firstName, lastName, phone });
      // Update cookie
      const stored = Cookies.get('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        Cookies.set('user', JSON.stringify({ ...parsed, firstName, lastName }));
      }
      setMsg('Perfil actualizado correctamente');
    } catch (err: any) {
      setMsg(err?.response?.data?.message ?? 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Datos personales</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Apellidos</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            type="email"
            value={user.email ?? ''}
            disabled
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
          />
          <p className="text-[11px] text-slate-400 mt-1">El email no se puede cambiar desde aquí</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
          <span
            className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border"
            style={{ background: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }}
          >
            {ROLE_LABELS[user.role ?? ''] ?? user.role ?? '—'}
          </span>
        </div>
        {msg && (
          <p className={`text-xs font-medium ${msg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: BRAND }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Tab: Contraseña ────────────────────────────────────────────── */
function TabContrasena() {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (newPwd !== confirm) { setMsg('Las contraseñas no coinciden'); return; }
    if (newPwd.length < 8) { setMsg('La contraseña debe tener al menos 8 caracteres'); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: newPwd });
      setMsg('Contraseña actualizada correctamente');
      setCurrent(''); setNewPwd(''); setConfirm('');
    } catch (err: any) {
      setMsg(err?.response?.data?.message ?? 'Error al cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-md">
      <h3 className="text-sm font-semibold text-slate-700">Cambiar contraseña</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña actual</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contraseña</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar nueva contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        {msg && (
          <p className={`text-xs font-medium ${msg.includes('Error') || msg.includes('no coinciden') || msg.includes('al menos') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: BRAND }}
          >
            {saving ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Tab: Clínicas ──────────────────────────────────────────────── */
function TabClinicas({ user }: { user: ProfileUser }) {
  // In fichaje-saas, the equivalent of clínicas are work centers
  const workCenter = user.workCenter;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Centros de trabajo</h3>
      {!workCenter ? (
        <p className="text-sm text-slate-400 text-center py-8">No hay centros de trabajo asociados</p>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: BRAND }}
          >
            {workCenter.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{workCenter.name}</p>
            <p className="text-xs text-slate-400">Centro de trabajo principal</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab: Empresa ───────────────────────────────────────────────── */
function TabEmpresa({ user }: { user: ProfileUser }) {
  const company = user.company;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Empresa</h3>
      {!company ? (
        <p className="text-sm text-slate-400 text-center py-8">No hay empresa asociada a tu cuenta</p>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: BRAND }}
          >
            {company.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{company.name}</p>
            <p className="text-xs text-slate-400">Empresa principal</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab: Aplicaciones ──────────────────────────────────────────── */
function TabAplicaciones() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Suite ImpulsoDent</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {IMPULSODENT_APPS.map(app => (
          <div key={app.name} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: app.color }}
            >
              {app.name.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{app.name}</p>
              <p className="text-xs text-slate-400 truncate">{app.desc}</p>
            </div>
            {app.href && (
              <a
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors flex-shrink-0"
              >
                Abrir
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Datos');

  const { data: user, isLoading } = useQuery<ProfileUser>({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/me').then(r => r.data?.data ?? r.data),
    retry: false,
    initialData: () => {
      try { return JSON.parse(Cookies.get('user') ?? '{}') as ProfileUser; }
      catch { return {} as ProfileUser; }
    },
  });

  const initials = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || '?';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mi Perfil</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestiona tus datos personales y seguridad</p>
      </div>

      {/* Avatar header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: BRAND }}
          >
            {isLoading ? '?' : initials}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span
              className="inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border"
              style={{ background: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }}
            >
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab row */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab
                ? 'text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
            }`}
            style={activeTab === tab ? { background: BRAND } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {user && (
        <>
          {activeTab === 'Datos'        && <TabDatos user={user} />}
          {activeTab === 'Contraseña'   && <TabContrasena />}
          {activeTab === 'Clínicas'     && <TabClinicas user={user} />}
          {activeTab === 'Empresa'      && <TabEmpresa user={user} />}
          {activeTab === 'Aplicaciones' && <TabAplicaciones />}
        </>
      )}
    </div>
  );
}
