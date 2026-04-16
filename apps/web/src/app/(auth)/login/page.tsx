'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Clock, Eye, EyeOff, Loader2, ShieldCheck, Smartphone, MapPin, X, KeyRound } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

const bottomCards = [
  { icon: Clock,       label: 'Fichajes en tiempo real' },
  { icon: MapPin,      label: 'Geolocalización' },
  { icon: ShieldCheck, label: 'Acceso seguro' },
];

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <KeyRound size={17} className="text-amber-600" />
            </div>
            <h2 className="font-bold text-slate-900">¿Olvidaste tu contraseña?</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Para restablecer tu contraseña, contacta con el <strong>administrador de tu empresa</strong>.
        </p>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          El administrador puede generar una nueva contraseña temporal desde el panel de gestión de empleados.
        </p>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#0f2744] text-white font-semibold text-sm hover:bg-[#1a3a5c] transition-colors">
          Entendido
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const res = await api.post('/auth/login', data);
      const { accessToken, refreshToken, user, mustChangePassword } = res.data;
      const opts = { secure: true, sameSite: 'strict' as const };
      Cookies.set('access_token',  accessToken,          { ...opts, expires: 1 });
      Cookies.set('refresh_token', refreshToken,         { ...opts, expires: 7 });
      Cookies.set('user',          JSON.stringify(user), { ...opts, expires: 1 });
      if (mustChangePassword) { router.push('/set-password'); return; }
      const role = user.role;
      if (role === 'SUPERADMIN') router.push('/superadmin/dashboard');
      else if (['COMPANY_ADMIN', 'HR', 'MANAGER'].includes(role)) router.push('/admin/dashboard');
      else router.push('/dashboard');
    } catch (err: any) {
      setServerError(err.response?.data?.message ?? 'Credenciales incorrectas');
    }
  };

  return (
    <>
    <div className="min-h-screen flex">

      {/* ── Left: brand panel ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f2744] flex-col justify-between p-12 overflow-hidden relative">

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1aad8d] rounded-xl flex items-center justify-center">
            <Clock size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">Fichaje App</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10">
          <h2 className="text-5xl font-bold text-white leading-tight">
            Control Horario
          </h2>
          <p className="text-[#1aad8d] text-3xl font-bold mt-1">
            para tu Empresa
          </p>
          <p className="text-white/60 text-base mt-4 leading-relaxed max-w-sm">
            Gestiona fichajes, horarios y ausencias de todo tu equipo.<br />
            Analiza, controla y actúa en tiempo real.
          </p>
        </div>

        {/* Bottom feature cards */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {bottomCards.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="bg-white/10 border border-white/15 rounded-2xl px-4 py-4 flex flex-col items-start gap-2"
            >
              <Icon size={20} className="text-[#1aad8d]" />
              <span className="text-white/80 text-xs font-medium leading-snug">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: form ────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-[#0f2744] rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-white" />
            </div>
            <span className="font-bold text-[#0f2744] text-base">Fichaje App</span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#0f2744]">Acceso al sistema</h1>
            <p className="text-slate-400 text-sm mt-1">Introduce tus credenciales para continuar</p>
          </div>

          {/* Error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 text-xs font-bold">!</span>
              {serverError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0f2744]/20 focus:border-[#0f2744] transition-colors"
              />
              {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-[#1aad8d] hover:text-[#0f2744] font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0f2744]/20 focus:border-[#0f2744] transition-colors pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-1 rounded-xl bg-[#0f2744] hover:bg-[#1a3a5c] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isSubmitting
                ? <><Loader2 className="animate-spin" size={16} />Verificando...</>
                : 'Entrar al sistema'
              }
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-bold text-slate-600 mb-2">Credenciales de demostración:</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>
                <span className="text-slate-600">Admin: </span>
                <span className="text-[#1aad8d] font-medium">superadmin@fichaje.app</span>
                <span className="text-slate-600"> / SuperAdmin123!</span>
              </p>
              <p>
                <span className="text-slate-600">Empresa: </span>
                <span className="text-[#1aad8d] font-medium">admin@techcorp.es</span>
                <span className="text-slate-600"> / Admin123!</span>
              </p>
              <p>
                <span className="text-slate-600">RRHH: </span>
                <span className="text-[#1aad8d] font-medium">rrhh@techcorp.es</span>
                <span className="text-slate-600"> / Admin123!</span>
              </p>
            </div>
          </div>

          {/* Kiosk link */}
          <div className="mt-5 text-center">
            <a
              href="/kiosk"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Smartphone size={13} />
              Acceder como terminal de kiosco
            </a>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-[11px] text-slate-300">
            © 2026 Fichaje App. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>

    {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  );
}
