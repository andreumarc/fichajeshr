'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Clock, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Smartphone, MapPin, X, KeyRound } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

const features = [
  { icon: Clock,       text: 'Control horario en tiempo real' },
  { icon: MapPin,      text: 'Geolocalización y geofencing' },
  { icon: ShieldCheck, text: 'Auditoría completa · Cumplimiento legal' },
  { icon: Smartphone,  text: 'App móvil, web y terminal kiosco' },
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
        <button onClick={onClose} className="btn-primary w-full text-sm py-2.5">Entendido</button>
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
      // First login — must set password
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
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Left: brand panel ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[44%] relative bg-brand-700 flex-col justify-between p-12 overflow-hidden">

        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

        {/* Decorative shapes */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-brand-500/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center shadow-lg">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">Fichaje App</p>
            <p className="text-brand-200 text-xs mt-0.5">Control Horario</p>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight text-balance">
              Gestiona el tiempo de trabajo de tu equipo
            </h2>
            <p className="text-brand-200 text-base leading-relaxed mt-4">
              Precisión, cumplimiento legal y visibilidad total — desde cualquier dispositivo.
            </p>
          </div>

          <ul className="space-y-3.5">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/15">
                  <Icon size={16} className="text-accent-300" />
                </div>
                <span className="text-brand-100 text-sm font-medium">{text}</span>
              </li>
            ))}
          </ul>

          {/* Stat pills */}
          <div className="flex gap-3 pt-2 flex-wrap">
            {[
              { value: '99.9%', label: 'Disponibilidad' },
              { value: 'RGPD', label: 'Cumplimiento' },
              { value: '24/7', label: 'Soporte' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 ring-1 ring-white/15 rounded-xl px-4 py-2.5 text-center">
                <p className="text-accent-300 font-bold text-sm">{s.value}</p>
                <p className="text-brand-200 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-brand-300/50 text-xs z-10">© 2025 Fichaje App · v1.0</p>
      </div>

      {/* ── Right: form ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-[400px] animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-white" />
            </div>
            <span className="font-bold text-brand-700 text-base">Fichaje App</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-semibold ring-1 ring-brand-100 mb-4">
              <span className="w-1.5 h-1.5 bg-accent-500 rounded-full" />
              Acceso seguro
            </div>
            <h1 className="text-2xl font-bold text-brand-800">Bienvenido de nuevo</h1>
            <p className="text-slate-500 text-sm mt-1">Introduce tus credenciales para continuar</p>
          </div>

          {/* Error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 text-xs font-bold ring-1 ring-rose-200">!</span>
              {serverError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-brand-700">Correo electrónico</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="usuario@empresa.com"
                className="input"
              />
              {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-brand-700">Contraseña</label>
                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-accent-600 hover:text-accent-800 font-medium transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm mt-1 group"
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin" size={16} />Verificando...</>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2">
            <a href="/kiosk" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700 transition-colors font-medium">
              <Smartphone size={14} />
              Acceder como terminal de kiosco
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex items-center justify-center gap-4">
            {['RGPD', 'SSL', 'ISO 27001'].map(b => (
              <span key={b} className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <ShieldCheck size={11} className="text-accent-400" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  );
}
