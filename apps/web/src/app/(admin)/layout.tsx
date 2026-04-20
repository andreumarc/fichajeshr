'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Clock, Building2, BarChart3, FileText,
  Settings, LogOut, ShieldCheck, ChevronRight, MessageSquare,
  CalendarDays, CalendarOff, Lock, Bell, Menu,
  ChevronLeft, ChevronRight as ChevronRightIcon, LayoutGrid, ExternalLink,
} from 'lucide-react';
import { ImpulsoDentIcon } from '@/components/ImpulsoDentIcon';
import { useState, useEffect } from 'react';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { GlobalFilters } from '@/components/layout/global-filters';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import clsx from 'clsx';

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Admin empresa',
  HR:            'RRHH',
  MANAGER:       'Manager',
  EMPLOYEE:      'Empleado',
  KIOSK:         'Kiosco',
  SUPERADMIN:    'Super Admin',
};

/* ─── ImpulsoDent Design System — Sidebar tokens ─────────────── */
const S = {
  BG:           '#0b1929',
  ACTIVE_BG:    '#22c55e',
  ACTIVE_TEXT:  '#ffffff',
  INACTIVE:     '#8ba8c0',
  GROUP:        '#3d5a75',
  HOVER:        'rgba(255,255,255,0.07)',
  BORDER:       'rgba(255,255,255,0.08)',
  LOGO_ICON:    '#0d9488',
  AVATAR_BG:    '#0d9488',
} as const;

/* ─── helpers ─────────────────────────────────────────────────── */
function getInitials(firstName = '', lastName = '') {
  return ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || '?';
}

function TopbarAvatar({ firstName = '', lastName = '' }: { firstName?: string; lastName?: string }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm text-white flex-shrink-0"
      style={{ background: S.AVATAR_BG }}
    >
      {getInitials(firstName, lastName)}
    </div>
  );
}

/* ─── nav definition ──────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    key: 'principal',
    label: 'PRINCIPAL',
    items: [
      { href: '/admin/dashboard',    label: 'Dashboard',           icon: LayoutDashboard, roles: undefined },
      { href: '/admin/time-entries', label: 'Fichajes',             icon: Clock,           roles: undefined },
      { href: '/admin/schedules',    label: 'Horarios',             icon: CalendarDays,    roles: ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN'] },
    ],
  },
  {
    key: 'admin',
    label: 'ADMINISTRACIÓN',
    items: [
      { href: '/admin/employees',      label: 'Empleados',           icon: Users,         roles: undefined },
      { href: '/admin/work-centers',   label: 'Centros de trabajo',  icon: Building2,     roles: ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN'] },
      { href: '/admin/leave-requests', label: 'Ausencias',           icon: CalendarOff,   roles: ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN'] },
      { href: '/admin/incidents',      label: 'Incidencias',         icon: FileText,      roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
      { href: '/admin/reports',        label: 'Informes',            icon: BarChart3,     roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
      { href: '/admin/whatsapp',       label: 'WhatsApp',            icon: MessageSquare, roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
    ],
  },
  {
    key: 'system',
    label: 'SISTEMA',
    items: [
      { href: '/admin/audit',    label: 'Auditoría',     icon: ShieldCheck, roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
      { href: '/admin/settings', label: 'Configuración', icon: Settings,    roles: ['COMPANY_ADMIN', 'SUPERADMIN'] },
    ],
  },
];

/* ─── NavItem with hover via state ───────────────────────────── */
function NavItem({
  href, label, Icon, isActive, collapsed, onClick,
}: {
  href: string; label: string; Icon: React.ElementType;
  isActive: boolean; collapsed: boolean; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const bg    = isActive ? S.ACTIVE_BG : hovered ? S.HOVER : 'transparent';
  const color = isActive ? S.ACTIVE_TEXT : S.INACTIVE;

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: bg, color }}
      className={clsx(
        'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150',
        collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
      )}
    >
      <Icon style={{ width: 18, height: 18, color, flexShrink: 0 }} />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          {isActive && <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.7)' }} />}
        </>
      )}
    </Link>
  );
}

/* ─── layout ──────────────────────────────────────────────────── */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [collapsed,     setCollapsed]     = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [user,          setUser]          = useState<any>({});
  const [showChangePwd, setShowChangePwd] = useState(false);

  useEffect(() => {
    try { setUser(JSON.parse(Cookies.get('user') ?? '{}')); } catch { setUser({}); }
    // restore sidebar state
    const stored = localStorage.getItem('fichajeshr-sidebar-collapsed');
    if (stored !== null) setCollapsed(stored === 'true');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(c => {
      localStorage.setItem('fichajeshr-sidebar-collapsed', String(!c));
      return !c;
    });
  };

  const handleLogout = async () => {
    const refreshToken = Cookies.get('refresh_token');
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
    ['access_token', 'refresh_token', 'user'].forEach(k => Cookies.remove(k));
    router.push('/login');
  };

  const allItems  = NAV_GROUPS.flatMap(g => g.items);
  const activePage = allItems.find(i => pathname === i.href || pathname.startsWith(i.href + '/'));

  /* ── Sidebar ────────────────────────────────────────────────── */
  const SidebarInner = ({ mobile = false }: { mobile?: boolean }) => {
    const isCollapsed = mobile ? false : collapsed;
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: S.BG, width: isCollapsed ? 64 : 256 }}
      >
        {/* Logo */}
        <div
          className={clsx(
            'flex items-center flex-shrink-0 py-5',
            isCollapsed ? 'px-4 justify-center' : 'px-4 gap-3',
          )}
          style={{ borderBottom: `1px solid ${S.BORDER}` }}
        >
          <ImpulsoDentIcon size={36} bg={S.LOGO_ICON} className="flex-shrink-0" />
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-none">FichajeHR</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: S.GROUP }}>
                {user.company?.name ?? 'Panel Admin'}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto sidebar-scroll">
          {NAV_GROUPS.map((group) => {
            const visible = group.items.filter(
              item => !item.roles || item.roles.includes(user.role),
            );
            if (visible.length === 0) return null;
            return (
              <div key={group.key}>
                {!isCollapsed ? (
                  <p
                    className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: S.GROUP }}
                  >
                    {group.label}
                  </p>
                ) : (
                  <div className="mb-2 mx-1" style={{ borderTop: `1px solid ${S.BORDER}` }} />
                )}
                <ul className="space-y-0.5">
                  {visible.map(item => (
                    <li key={item.href}>
                      <NavItem
                        href={item.href}
                        label={item.label}
                        Icon={item.icon}
                        isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                        collapsed={isCollapsed}
                        onClick={() => setMobileOpen(false)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* ImpulsoDent Hub */}
        <div className="px-2 py-2" style={{ borderTop: `1px solid ${S.BORDER}` }}>
          <a
            href="https://app.impulsodent.com"
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isCollapsed && 'justify-center',
            )}
            style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(13,148,136,0.25)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(13,148,136,0.12)'; }}
            title={isCollapsed ? 'ImpulsoDent Hub' : undefined}
          >
            <LayoutGrid style={{ width: 18, height: 18, flexShrink: 0 }} />
            {!isCollapsed && (
              <>
                <span className="truncate flex-1">ImpulsoDent Hub</span>
                <ExternalLink style={{ width: 14, height: 14, opacity: 0.6 }} />
              </>
            )}
          </a>
        </div>

        {/* Collapse button — desktop only */}
        {!mobile && (
          <CollapseBtn collapsed={collapsed} onToggle={toggleCollapsed} />
        )}

        {/* User strip */}
        <div
          className="flex-shrink-0 px-2 py-2"
          style={{ borderTop: `1px solid ${S.BORDER}` }}
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs text-white flex-shrink-0"
                style={{ background: S.AVATAR_BG }}
              >
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-none">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: S.GROUP }}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </p>
              </div>
              <button
                onClick={() => setShowChangePwd(true)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: S.INACTIVE }}
                title="Cambiar contraseña"
              >
                <Lock style={{ width: 13, height: 13 }} />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/15 hover:text-red-300"
                style={{ color: S.INACTIVE }}
                title="Cerrar sesión"
              >
                <LogOut style={{ width: 13, height: 13 }} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[11px] text-white"
                style={{ background: S.AVATAR_BG }}
              >
                {getInitials(user.firstName, user.lastName)}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-500/15"
                style={{ color: S.INACTIVE }}
              >
                <LogOut style={{ width: 13, height: 13 }} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Root ───────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out">
        <SidebarInner />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 shadow-2xl">
            <SidebarInner mobile />
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-3 flex-shrink-0">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title / breadcrumb */}
          <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
            <span className="font-semibold text-gray-900 truncate">
              {activePage?.label ?? 'Panel Admin'}
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5">
            {/* Bell */}
            <button className="relative p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 mx-1" />

            {/* User */}
            <button
              onClick={() => setShowChangePwd(true)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TopbarAvatar firstName={user.firstName} lastName={user.lastName} />
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-sm font-semibold text-gray-900 leading-none truncate max-w-[160px]">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Global filter bar */}
        <GlobalFilters />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 sm:p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}

/* ─── Collapse button component ───────────────────────────────── */
function CollapseBtn({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)` }}>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={clsx(
          'hidden lg:flex items-center gap-2 w-full px-4 py-3 text-sm transition-colors duration-150',
          collapsed ? 'justify-center' : '',
        )}
        style={{ color: hovered ? '#ffffff' : '#8ba8c0' }}
      >
        {collapsed
          ? <ChevronRightIcon style={{ width: 16, height: 16 }} />
          : (
            <>
              <ChevronLeft style={{ width: 16, height: 16 }} />
              <span>Colapsar</span>
            </>
          )
        }
      </button>
    </div>
  );
}
