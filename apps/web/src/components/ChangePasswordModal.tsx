'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { X, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

interface Props { onClose: () => void; }

export default function ChangePasswordModal({ onClose }: Props) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const rules = [
    { ok: form.next.length >= 8,        label: 'Mínimo 8 caracteres' },
    { ok: /[A-Z]/.test(form.next),      label: 'Una mayúscula' },
    { ok: /[0-9]/.test(form.next),      label: 'Un número' },
  ];
  const valid = form.current.length >= 1 && rules.every(r => r.ok) && form.next === form.confirm;

  const mutation = useMutation({
    mutationFn: () => api.patch('/auth/change-password', {
      currentPassword: form.current,
      newPassword: form.next,
    }),
    onSuccess: () => setSuccess(true),
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error al cambiar la contraseña'),
  });

  const toggle = (k: keyof typeof show) => setShow(p => ({ ...p, [k]: !p[k] }));
  const set    = (k: keyof typeof form)  => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-24 pb-8">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Lock size={15} className="text-brand-600" />
            </div>
            <h2 className="font-bold text-slate-900">Cambiar contraseña</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">✓</span>
              </div>
              <p className="font-semibold text-slate-900">Contraseña actualizada</p>
              <p className="text-sm text-slate-500">Tu contraseña ha sido cambiada correctamente.</p>
              <button onClick={onClose} className="btn-primary mt-2 px-6">Cerrar</button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">{error}</div>
              )}

              {/* Current password */}
              <div>
                <label className="label">Contraseña actual</label>
                <div className="relative">
                  <input type={show.current ? 'text' : 'password'} className="input pr-10"
                    placeholder="Tu contraseña actual" value={form.current} onChange={set('current')} />
                  <button type="button" onClick={() => toggle('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show.current ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="label">Nueva contraseña</label>
                <div className="relative">
                  <input type={show.next ? 'text' : 'password'} className="input pr-10"
                    placeholder="Mínimo 8 caracteres" value={form.next} onChange={set('next')} />
                  <button type="button" onClick={() => toggle('next')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show.next ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="label">Confirmar nueva contraseña</label>
                <div className="relative">
                  <input type={show.confirm ? 'text' : 'password'} className="input pr-10"
                    placeholder="Repite la contraseña" value={form.confirm} onChange={set('confirm')} />
                  <button type="button" onClick={() => toggle('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Password rules */}
              {form.next && (
                <ul className="space-y-1 text-xs">
                  {rules.map(r => (
                    <li key={r.label} className={`flex items-center gap-2 ${r.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${r.ok ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        {r.ok ? '✓' : '·'}
                      </span>
                      {r.label}
                    </li>
                  ))}
                  {form.confirm && (
                    <li className={`flex items-center gap-2 ${form.next === form.confirm ? 'text-emerald-600' : 'text-rose-500'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${form.next === form.confirm ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                        {form.next === form.confirm ? '✓' : '✗'}
                      </span>
                      Las contraseñas coinciden
                    </li>
                  )}
                </ul>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => mutation.mutate()}
                  disabled={!valid || mutation.isPending}
                  className="btn-primary flex-1 gap-2"
                >
                  {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Cambiar contraseña
                </button>
                <button onClick={onClose} className="btn-secondary px-5">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
