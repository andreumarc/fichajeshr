'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { ImpulsoDentIcon } from '@/components/ImpulsoDentIcon';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const rules = [
    { ok: password.length >= 8,             label: 'Mínimo 8 caracteres' },
    { ok: /[A-Z]/.test(password),           label: 'Una mayúscula' },
    { ok: /[0-9]/.test(password),           label: 'Un número' },
  ];
  const valid = rules.every(r => r.ok) && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/set-password', { newPassword: password });
      // Update cookie to clear mustChangePassword
      const raw = Cookies.get('user');
      if (raw) {
        const u = JSON.parse(raw);
        Cookies.set('user', JSON.stringify({ ...u, mustChangePassword: false }), { expires: 1, secure: true, sameSite: 'strict' });
      }
      const role = JSON.parse(Cookies.get('user') ?? '{}').role;
      if (role === 'SUPERADMIN') router.push('/superadmin/dashboard');
      else if (['COMPANY_ADMIN', 'HR', 'MANAGER'].includes(role)) router.push('/admin/dashboard');
      else router.push('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Error al guardar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <ImpulsoDentIcon size={40} />
          <div>
            <p className="font-bold text-brand-800 text-base leading-none">FichajeHR</p>
            <p className="text-slate-400 text-xs">Control Horario</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={22} className="text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Crea tu contraseña</h1>
            <p className="text-sm text-slate-500 mt-1">
              Es tu primer acceso. Establece una contraseña segura para tu cuenta.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showConf ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Repite la contraseña"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
                <button type="button" onClick={() => setShowConf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Rules */}
            {password && (
              <ul className="space-y-1.5 text-xs">
                {rules.map(r => (
                  <li key={r.label} className={`flex items-center gap-2 ${r.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${r.ok ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {r.ok ? '✓' : '·'}
                    </span>
                    {r.label}
                  </li>
                ))}
                {confirm && (
                  <li className={`flex items-center gap-2 ${password === confirm ? 'text-emerald-600' : 'text-rose-500'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${password === confirm ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      {password === confirm ? '✓' : '✗'}
                    </span>
                    Las contraseñas coinciden
                  </li>
                )}
              </ul>
            )}

            <button
              type="submit"
              disabled={!valid || loading}
              className="btn-primary w-full py-3 mt-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" />Guardando...</> : 'Activar cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
