'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, History, AlertCircle, LogOut, Calendar, CalendarOff, Lock } from 'lucide-react';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { useState, useEffect } from 'react';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const tabs = [
  { href: '/dashboard',      label: 'Inicio',      icon: LayoutDashboard },
  { href: '/history',        label: 'Historial',   icon: History },
  { href: '/schedule',       label: 'Horario',     icon: Calendar },
  { href: '/leave-requests', label: 'Ausencias',   icon: CalendarOff },
  { href: '/incidents',      label: 'Incidencias', icon: AlertCircle },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser]                   = useState<any>({});
  const [showChangePwd, setShowChangePwd] = useState(false);

  useEffect(() => {
    try {
      setUser(JSON.parse(Cookies.get('user') ?? '{}'));
    } catch { setUser({}); }
  }, []);

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  const handleLogout = async () => {
    const refreshToken = Cookies.get('refresh_token');
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
    ['access_token', 'refresh_token', 'user'].forEach((k) => Cookies.remove(k));
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto">

      {/* ── Top header ─────────────────────────── */}
      <header className="bg-brand-700 sticky top-0 z-10 shadow-brand-md">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {initials || '?'}
            </div>
            <div>
              <p className="font-semibold text-sm text-white leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-brand-200 mt-0.5">
                {user.employee?.workCenter?.name ?? user.company?.name ?? 'Empleado'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowChangePwd(true)}
            className="flex items-center gap-1.5 text-brand-200 hover:text-white text-xs px-2.5 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Cambiar contraseña"
          >
            <Lock size={13} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-brand-200 hover:text-white text-xs px-2.5 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      {/* ── Page content ───────────────────────── */}
      <main className="flex-1 px-4 py-5 animate-fade-in">{children}</main>

      {/* ── Bottom navigation ──────────────────── */}
      <nav className="sticky bottom-0 bg-white border-t border-slate-100 shadow-[0_-1px_8px_rgba(0,58,112,0.07)]">
        <div className="grid grid-cols-5 h-16">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'text-brand-700'
                    : 'text-slate-400 hover:text-brand-500'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-700 rounded-b-full" />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}
