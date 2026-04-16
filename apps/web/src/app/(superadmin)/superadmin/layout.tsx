'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, Users, Clock, LogOut, Menu,
  ChevronRight, Shield, Lock, Bell,
  ChevronLeft, ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import clsx from 'clsx';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import '@/lib/i18n';

/* ─── helpers ─────────────────────────────────────────────────── */
function getInitials(firstName = '', lastName = '') {
  return ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || '?';
}

function UserAvatar({ firstName = '', lastName = '', size = 'md' }: { firstName?: string; lastName?: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = getInitials(firstName, lastName);
  const sz = size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-bold flex-shrink-0 bg-[#1e3a5f] text-white ring-2 ring-white/20', sz)}>
      {initials}
    </div>
  );
}

/* ─── nav definition ──────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    key: 'platform',
    label: 'PLATAFORMA',
    items: [
      { href: '/superadmin/dashboard',    labelKey: 'superadmin.nav.dashboard',   icon: LayoutDashboard },
      { href: '/superadmin/companies',    labelKey: 'superadmin.nav.companies',    icon: Building2 },
      { href: '/superadmin/employees',    labelKey: 'superadmin.nav.employees',    icon: Users },
      { href: '/superadmin/time-entries', labelKey: 'superadmin.nav.timeEntries', icon: Clock },
    ],
  },
];

/* ─── layout ──────────────────────────────────────────────────── */
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { t }    = useTranslation();

  const [collapsed,     setCollapsed]     = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [user,          setUser]          = useState<any>({});
  const [showChangePwd, setShowChangePwd] = useState(false);

  useEffect(() => {
    try { setUser(JSON.parse(Cookies.get('user') ?? '{}')); } catch { setUser({}); }
  }, []);

  const handleLogout = async () => {
    const refreshToken = Cookies.get('refresh_token');
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
    ['access_token', 'refresh_token', 'user'].forEach(k => Cookies.remove(k));
    router.push('/login');
  };

  const allItems = NAV_GROUPS.flatMap(g => g.items);
  const activePage = allItems.find(i => pathname === i.href || pathname.startsWith(i.href + '/'));

  /* ── Sidebar inner ─────────────────────────────────────────── */
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={clsx(
      'flex flex-col h-full bg-[#0f2744] transition-all duration-300 ease-in-out',
      !mobile && (collapsed ? 'w-[68px]' : 'w-[220px]'),
    )}>
      {/* Logo */}
      <div className={clsx(
        'h-16 flex items-center border-b border-white/10 flex-shrink-0',
        collapsed && !mobile ? 'px-4 justify-center' : 'px-5 gap-3',
      )}>
        <div className="w-9 h-9 bg-[#1aad8d] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
          <Shield size={17} className="text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-white text-sm leading-none tracking-tight">Fichaje App</p>
              <span className="px-1.5 py-0.5 bg-[#1aad8d] text-white rounded-md text-[9px] font-bold tracking-wider uppercase leading-none">
                MASTER
              </span>
            </div>
            <p className="text-white/40 text-[10px] mt-0.5">Panel SaaS Admin</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.key}>
            {(!collapsed || mobile) && (
              <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                {group.label}
              </p>
            )}
            {collapsed && !mobile && <div className="border-t border-white/10 mb-2 mx-2" />}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed && !mobile ? t(item.labelKey as any) : undefined}
                    className={clsx(
                      'group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150',
                      collapsed && !mobile ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-[#1aad8d] text-white shadow-md'
                        : 'text-white/60 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <item.icon
                      size={16}
                      className={clsx(
                        'flex-shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-white/50 group-hover:text-white',
                      )}
                    />
                    {(!collapsed || mobile) && (
                      <>
                        <span className="flex-1 leading-none">{t(item.labelKey as any)}</span>
                        {isActive && <ChevronRight size={12} className="opacity-80" />}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse button — desktop only */}
      {!mobile && (
        <button
          onClick={() => setCollapsed(c => !c)}
          className={clsx(
            'flex items-center gap-2 mx-2 mb-3 px-3 py-2.5 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/10 transition-all duration-150 border border-white/10',
            collapsed ? 'justify-center' : '',
          )}
        >
          {collapsed
            ? <ChevronRightIcon size={14} />
            : (
              <>
                <ChevronLeft size={14} />
                <span className="font-medium">Colapsar</span>
              </>
            )
          }
        </button>
      )}

      {/* User strip */}
      <div className={clsx(
        'border-t border-white/10 flex-shrink-0 px-2 py-2',
        collapsed && !mobile ? 'flex flex-col items-center gap-2' : '',
      )}>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
            <UserAvatar firstName={user.firstName} lastName={user.lastName} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">{t('roles.SUPERADMIN')}</p>
            </div>
            <button
              onClick={() => setShowChangePwd(true)}
              title="Cambiar contraseña"
              className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Lock size={13} />
            </button>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 text-white/30 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <>
            <UserAvatar firstName={user.firstName} lastName={user.lastName} size="sm" />
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 text-white/30 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors"
            >
              <LogOut size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  /* ── Root layout ───────────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[220px] shadow-2xl">
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0 shadow-sm">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} className="text-slate-600" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-400 hidden sm:block">Superadmin</span>
            {activePage && (
              <>
                <ChevronRight size={14} className="text-slate-300 hidden sm:block flex-shrink-0" />
                <span className="font-semibold text-[#0f2744] truncate">
                  {t(activePage.labelKey as any)}
                </span>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Notification bell */}
            <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1aad8d] rounded-full ring-2 ring-white" />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-100 mx-1" />

            {/* User info */}
            <button
              onClick={() => setShowChangePwd(true)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <UserAvatar firstName={user.firstName} lastName={user.lastName} size="md" />
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-xs font-semibold text-[#0f2744] leading-none truncate max-w-[140px]">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">{t('roles.SUPERADMIN')}</span>
              </div>
              <ChevronRight size={13} className="text-slate-300 hidden sm:block group-hover:text-slate-500 transition-colors" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}
