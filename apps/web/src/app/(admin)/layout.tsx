'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Clock, Building2, BarChart3, FileText,
  Settings, LogOut, Menu, ShieldCheck, ChevronRight, MessageSquare,
  CalendarDays, CalendarOff, Lock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import clsx from 'clsx';
import '@/lib/i18n';

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center font-bold bg-accent-500/20 text-accent-300 ring-1 ring-accent-400/30 flex-shrink-0',
      size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm',
    )}>
      {initials}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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

  const navGroups = [
    {
      label: t('nav.groups.general'),
      items: [
        { href: '/admin/dashboard',    label: t('nav.dashboard'),     icon: LayoutDashboard, roles: undefined },
        { href: '/admin/employees',    label: t('nav.employees'),     icon: Users,           roles: undefined },
        { href: '/admin/time-entries', label: t('nav.timeEntries'),   icon: Clock,           roles: undefined },
        { href: '/admin/work-centers', label: t('nav.workCenters'),   icon: Building2,       roles: ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN'] },
        { href: '/admin/schedules',    label: t('nav.schedules'),     icon: CalendarDays,    roles: ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN'] },
      ],
    },
    {
      label: t('nav.groups.hr'),
      items: [
        { href: '/admin/leave-requests', label: t('nav.leaveRequests'), icon: CalendarOff, roles: ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN'] },
      ],
    },
    {
      label: t('nav.groups.analysis'),
      items: [
        { href: '/admin/reports',   label: t('nav.reports'),   icon: BarChart3,     roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
        { href: '/admin/incidents', label: t('nav.incidents'), icon: FileText,      roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
        { href: '/admin/whatsapp',  label: t('nav.whatsapp'),  icon: MessageSquare, roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
      ],
    },
    {
      label: t('nav.groups.system'),
      items: [
        { href: '/admin/audit',    label: t('nav.audit'),    icon: ShieldCheck, roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
        { href: '/admin/settings', label: t('nav.settings'), icon: Settings,    roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
      ],
    },
  ];

  const handleLogout = async () => {
    const refreshToken = Cookies.get('refresh_token');
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
    ['access_token', 'refresh_token', 'user'].forEach((k) => Cookies.remove(k));
    router.push('/login');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-brand-700">

      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/30">
            <Clock size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none tracking-tight">Fichaje App</p>
            <p className="text-brand-200 text-[11px] mt-0.5 truncate max-w-[140px]">
              {user.company?.name ?? 'Panel Admin'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            item => !item.roles || item.roles.includes(user.role),
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-300/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
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
                      <item.icon size={16} className={clsx('flex-shrink-0', isActive ? 'text-white' : 'text-brand-200/70 group-hover:text-white')} />
                      <span className="flex-1 leading-none">{item.label}</span>
                      {isActive && <ChevronRight size={13} className="opacity-70" />}
                    </Link>
                  );
                })}
              </div>
            </div>
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
          <Avatar name={`${user.firstName ?? ''} ${user.lastName ?? ''}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-brand-200/70 mt-0.5">{t(`roles.${user.role}` as any) ?? user.role}</p>
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
          <aside className="absolute left-0 top-0 bottom-0 w-[var(--sidebar-width)] shadow-2xl animate-slide-up">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile header */}
        <header className="lg:hidden h-14 bg-white border-b border-slate-100 px-4 flex items-center gap-3 shadow-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} className="text-brand-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent-500 rounded-lg flex items-center justify-center">
              <Clock size={13} className="text-white" />
            </div>
            <span className="font-bold text-brand-700 text-sm">Fichaje App</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Avatar name={`${user.firstName ?? ''} ${user.lastName ?? ''}`} size="sm" />
          </div>
        </header>

        {/* Top bar (desktop) */}
        <div className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-white border-b border-slate-100 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {(() => {
              const allItems = navGroups.flatMap(g => g.items);
              const active = allItems.find(i => pathname.startsWith(i.href));
              return active ? (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="font-semibold text-brand-700">{active.label}</span>
                </>
              ) : null;
            })()}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <LanguageSwitcher />
            <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse" />
            <span>{user.firstName} {user.lastName}</span>
            <span className="text-slate-200">·</span>
            <span>{t(`roles.${user.role}` as any) ?? user.role}</span>
          </div>
        </div>

        {/* Page scroll container */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-7 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}
