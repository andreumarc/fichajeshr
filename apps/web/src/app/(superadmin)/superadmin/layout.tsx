'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  LogOut,
  Menu,
  ChevronRight,
  Shield,
  X,
  Lock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import clsx from 'clsx';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import '@/lib/i18n';

function Avatar({ name }: { name: string }) {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold bg-accent-500/25 text-accent-300 ring-1 ring-accent-400/40 flex-shrink-0 text-sm">
      {initials}
    </div>
  );
}

function AvatarSm({ name }: { name: string }) {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold bg-accent-500/25 text-accent-300 ring-1 ring-accent-400/40 flex-shrink-0 text-xs">
      {initials}
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [user, setUser]                   = useState<any>({});
  const [showChangePwd, setShowChangePwd] = useState(false);

  useEffect(() => {
    try {
      setUser(JSON.parse(Cookies.get('user') ?? '{}'));
    } catch { setUser({}); }
  }, []);

  const navItems = [
    { href: '/superadmin/dashboard',    label: t('superadmin.nav.dashboard'),   icon: LayoutDashboard },
    { href: '/superadmin/companies',    label: t('superadmin.nav.companies'),    icon: Building2 },
    { href: '/superadmin/employees',    label: t('superadmin.nav.employees'),    icon: Users },
    { href: '/superadmin/time-entries', label: t('superadmin.nav.timeEntries'), icon: Clock },
  ];

  const handleLogout = async () => {
    const refreshToken = Cookies.get('refresh_token');
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
    ['access_token', 'refresh_token', 'user'].forEach((k) => Cookies.remove(k));
    router.push('/login');
  };

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  const currentItem = navItems.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'));

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-brand-700">

      {/* Logo + MASTER badge */}
      <div className="px-5 h-16 flex items-center gap-3 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 bg-accent-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/30">
          <Shield size={17} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-white text-sm leading-none tracking-tight">Fichaje App</p>
            <span className="px-1.5 py-0.5 bg-accent-500 text-white rounded-md text-[9px] font-bold tracking-wider uppercase leading-none">
              MASTER
            </span>
          </div>
          <p className="text-brand-200 text-[11px] mt-0.5">Panel SaaS Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-300/70">
          Plataforma
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent-500 text-white shadow-md shadow-brand-900/30'
                  : 'text-brand-100/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <item.icon
                size={16}
                className={clsx(
                  'flex-shrink-0',
                  isActive ? 'text-white' : 'text-brand-200/70 group-hover:text-white',
                )}
              />
              <span className="flex-1 leading-none">{item.label}</span>
              {isActive && <ChevronRight size={13} className="opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0 space-y-2">
        {/* Language switcher */}
        <div className="flex items-center justify-center px-2">
          <LanguageSwitcher variant="light" />
        </div>
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/10 transition-colors">
          <Avatar name={fullName} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-none">{fullName}</p>
            <p className="text-xs text-brand-200/70 mt-0.5">{t('roles.SUPERADMIN')}</p>
          </div>
          <button
            onClick={() => setShowChangePwd(true)}
            title={t('nav.changePassword')}
            className="p-1.5 text-brand-200/60 hover:text-brand-100 hover:bg-white/15 rounded-lg transition-colors"
          >
            <Lock size={14} />
          </button>
          <button
            onClick={handleLogout}
            title={t('nav.logout')}
            className="p-1.5 text-brand-200/60 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[var(--sidebar-width)] flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-brand-900/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[var(--sidebar-width)] shadow-2xl">
            <Sidebar />
          </aside>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile header */}
        <header className="lg:hidden h-14 bg-brand-700 border-b border-white/10 px-4 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu size={20} className="text-white" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-accent-500 rounded-lg flex items-center justify-center">
              <Shield size={13} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">Fichaje App</span>
            <span className="px-1.5 py-0.5 bg-accent-500 text-white rounded-md text-[9px] font-bold tracking-wider uppercase">
              MASTER
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher variant="light" />
            <AvatarSm name={fullName} />
          </div>
        </header>

        {/* Top bar (desktop) */}
        <div className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-white border-b border-slate-100 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {currentItem && (
              <>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-brand-700">{currentItem.label}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <LanguageSwitcher />
            <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse" />
            <span>{fullName}</span>
            <span className="text-slate-200">·</span>
            <span className="text-accent-600 font-semibold">{t('roles.SUPERADMIN')}</span>
          </div>
        </div>

        {/* Page scroll container */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-7">
            {children}
          </div>
        </main>
      </div>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}
