'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Clock, Eye, EyeOff, Loader2, ShieldCheck, Smartphone, MapPin, X, KeyRound } from 'lucide-react';
import { ImpulsoDentIcon } from '@/components/ImpulsoDentIcon';

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

/* ImpulsoDent Design System — colores exactos */
const BRAND  = '#003A70';
const BRAND6 = '#003263';
const ACCENT = '#00A99D';

const bottomCards = [
  { icon: Clock,       label: 'Fichajes en tiempo real' },
  { icon: MapPin,      label: 'Geolocalización' },
  { icon: ShieldCheck, label: 'Acceso seguro' },
];

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-card-hover w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <KeyRound size={17} className="text-amber-600" />
            </div>
            <h2 className="font-bold text-gray-900">¿Olvidaste tu contraseña?</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Para restablecer tu contraseña, contacta con el <strong>administrador de tu empresa</strong>.
        </p>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          El administrador puede generar una nueva contraseña temporal desde el panel de gestión de empleados.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-colors"
          style={{ background: BRAND }}
          onMouseEnter={e => (e.currentTarget.style.background = BRAND6)}
          onMouseLeave={e => (e.currentTarget.style.background = BRAND)}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError,  setServerError]  = useState('');
  const [showForgot,   setShowForgot]   = useState(false);

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
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 overflow-hidden relative"
        style={{ background: BRAND }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <ImpulsoDentIcon size={40} bg="#0d9488" />
          <span className="text-white font-bold text-lg">FichajeHR</span>
        </div>

        {/* Copy */}
        <div className="relative z-10">
          <h2 className="text-5xl font-bold text-white leading-tight">Control Horario</h2>
          <p className="text-3xl font-bold mt-1" style={{ color: ACCENT }}>para tu Empresa</p>
          <p className="text-white/60 text-base mt-4 leading-relaxed max-w-sm">
            Gestiona fichajes, horarios y ausencias de todo tu equipo.<br />
            Analiza, controla y actúa en tiempo real.
          </p>
        </div>

        {/* Feature cards */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {bottomCards.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 flex flex-col items-start gap-2"
            >
              <Icon size={20} style={{ color: ACCENT }} />
              <span className="text-white/80 text-xs font-medium leading-snug">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: form ────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <ImpulsoDentIcon size={36} />
            <span className="font-bold text-sm" style={{ color: BRAND }}>FichajeHR</span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold" style={{ color: BRAND }}>Acceso al sistema</h1>
            <p className="text-gray-400 text-sm mt-1">Introduce tus credenciales para continuar</p>
          </div>

          {/* Error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600 text-xs font-bold">!</span>
              {serverError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: ACCENT }}
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 mt-1 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              style={{ background: BRAND }}
              onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = BRAND6; }}
              onMouseLeave={e => { e.currentTarget.style.background = BRAND; }}
            >
              {isSubmitting
                ? <><Loader2 className="animate-spin" size={16} />Verificando...</>
                : 'Entrar al sistema'
              }
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-bold text-gray-600 mb-2">Credenciales de demostración:</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>
                <span className="text-gray-600">Empresa: </span>
                <span className="font-medium" style={{ color: ACCENT }}>admin@techcorp.es</span>
                <span className="text-gray-600"> / Admin123!</span>
              </p>
              <p>
                <span className="text-gray-600">RRHH: </span>
                <span className="font-medium" style={{ color: ACCENT }}>rrhh@techcorp.es</span>
                <span className="text-gray-600"> / Admin123!</span>
              </p>
              <p>
                <span className="text-gray-600">Empleado: </span>
                <span className="font-medium" style={{ color: ACCENT }}>ana.garcia@techcorp.es</span>
                <span className="text-gray-600"> / Admin123!</span>
              </p>
            </div>
          </div>

          {/* Kiosk link */}
          <div className="mt-5 text-center">
            <a
              href="/kiosk"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Smartphone size={13} />
              Acceder como terminal de kiosco
            </a>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-[11px] text-gray-300">
            © 2026 FichajeHR. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>

    {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  );
}
