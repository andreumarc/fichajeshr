'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Settings2, Shield, Globe, Bell, Database, Zap,
  CheckCircle2, Info, Server, Clock, Users, Building2,
} from 'lucide-react';

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-accent-500' : 'bg-slate-200'}`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      <span className={`text-xs font-medium ${enabled ? 'text-accent-700' : 'text-slate-400'}`}>
        {enabled ? 'Activado' : 'Desactivado'}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const { data: stats } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: () => api.get('/superadmin/stats').then(r => r.data),
  });

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-800">Configuración de plataforma</h1>
        <p className="text-slate-500 text-sm mt-0.5">Parámetros globales del sistema FichajeHR SaaS</p>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: 'Empresas',  value: stats?.companiesCount ?? '—', color: 'bg-brand-50 text-brand-700' },
          { icon: Users,     label: 'Empleados', value: stats?.employeesCount ?? '—', color: 'bg-violet-50 text-violet-700' },
          { icon: Clock,     label: 'Fichajes hoy', value: stats?.todayEntries ?? '—', color: 'bg-sky-50 text-sky-700' },
          { icon: CheckCircle2, label: 'Activas', value: stats?.activeCompanies ?? '—', color: 'bg-emerald-50 text-emerald-700' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={17} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Seguridad */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <Shield size={16} className="text-brand-600" />
            <h2 className="font-semibold text-brand-800 text-sm">Seguridad</h2>
          </div>
          <div className="px-5">
            <SettingRow label="Autenticación 2FA" description="Factor adicional para accesos de administrador">
              <Toggle enabled={false} label="2FA" />
            </SettingRow>
            <SettingRow label="Bloqueo tras intentos fallidos" description="Bloquea la cuenta tras 5 intentos fallidos">
              <Toggle enabled={true} label="Bloqueo" />
            </SettingRow>
            <SettingRow label="Caducidad de contraseñas" description="Forzar cambio cada 90 días">
              <Toggle enabled={false} label="Caducidad" />
            </SettingRow>
          </div>
        </div>

        {/* Registro y acceso */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <Globe size={16} className="text-accent-600" />
            <h2 className="font-semibold text-brand-800 text-sm">Registro y acceso</h2>
          </div>
          <div className="px-5">
            <SettingRow label="Registro público de empresas" description="Permitir auto-registro desde la web">
              <Toggle enabled={false} label="Registro" />
            </SettingRow>
            <SettingRow label="Modo kiosco global" description="Permitir terminales de kiosco en todos los centros">
              <Toggle enabled={true} label="Kiosco" />
            </SettingRow>
            <SettingRow label="SSO corporativo" description="Acceso mediante proveedor de identidad externo">
              <Toggle enabled={false} label="SSO" />
            </SettingRow>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <Bell size={16} className="text-amber-600" />
            <h2 className="font-semibold text-brand-800 text-sm">Notificaciones</h2>
          </div>
          <div className="px-5">
            <SettingRow label="Alertas de nuevo cliente" description="Email cuando una empresa se registra">
              <Toggle enabled={true} label="Alertas" />
            </SettingRow>
            <SettingRow label="Resumen diario" description="Informe diario de actividad de la plataforma">
              <Toggle enabled={false} label="Resumen" />
            </SettingRow>
            <SettingRow label="Alertas de error del sistema" description="Notificar errores críticos en tiempo real">
              <Toggle enabled={true} label="Errores" />
            </SettingRow>
          </div>
        </div>

        {/* Sistema */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <Server size={16} className="text-violet-600" />
            <h2 className="font-semibold text-brand-800 text-sm">Sistema</h2>
          </div>
          <div className="px-5">
            <SettingRow label="Modo mantenimiento" description="Bloquear acceso a usuarios durante actualizaciones">
              <Toggle enabled={false} label="Mantenimiento" />
            </SettingRow>
            <SettingRow label="Caché de consultas" description="Acelerar respuestas mediante caché en memoria">
              <Toggle enabled={true} label="Caché" />
            </SettingRow>
            <SettingRow label="Logs de auditoría" description="Registrar todas las acciones de la plataforma">
              <Toggle enabled={true} label="Logs" />
            </SettingRow>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Los cambios en la configuración del sistema requieren acceso de superadministrador y pueden afectar a todas las empresas de la plataforma.
          Contacta con el equipo técnico antes de modificar parámetros críticos.
        </p>
      </div>
    </div>
  );
}
