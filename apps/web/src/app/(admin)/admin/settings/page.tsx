'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Settings, Save, Loader2, Building2, MessageSquare,
  MapPin, Bell, Shield, Check, Globe,
} from 'lucide-react';

interface CompanySettings {
  name: string;
  taxId: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  logoUrl: string;
  settings: {
    whatsappEnabled: boolean;
    whatsappGeoPolicy: 'REQUIRE' | 'ALLOW_PENDING' | 'OPTIONAL';
    geofenceToleranceMeters: number;
    allowManualEdits: boolean;
    requireManagerApproval: boolean;
    workdayMaxHours: number;
    breakMaxMinutes: number;
    notifyOnIncident: boolean;
    notifyOnLateArrival: boolean;
    lateArrivalThresholdMinutes: number;
  };
}

const SECTION_CLASSES = 'card space-y-4';
const SECTION_TITLE_CLASSES = 'flex items-center gap-2 font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-1';

function ToggleField({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get('/companies/me').then((r) => r.data),
  });

  const [form, setForm] = useState<CompanySettings>({
    name: '',
    taxId: '',
    address: '',
    city: '',
    country: 'ES',
    timezone: 'Europe/Madrid',
    logoUrl: '',
    settings: {
      whatsappEnabled: false,
      whatsappGeoPolicy: 'REQUIRE',
      geofenceToleranceMeters: 50,
      allowManualEdits: true,
      requireManagerApproval: false,
      workdayMaxHours: 12,
      breakMaxMinutes: 90,
      notifyOnIncident: true,
      notifyOnLateArrival: true,
      lateArrivalThresholdMinutes: 15,
    },
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? '',
        taxId: company.taxId ?? '',
        address: company.address ?? '',
        city: company.city ?? '',
        country: company.country ?? 'ES',
        timezone: company.timezone ?? 'Europe/Madrid',
        logoUrl: company.logoUrl ?? '',
        settings: {
          whatsappEnabled: company.settings?.whatsappEnabled ?? false,
          whatsappGeoPolicy: company.settings?.whatsappGeoPolicy ?? 'REQUIRE',
          geofenceToleranceMeters: company.settings?.geofenceToleranceMeters ?? 50,
          allowManualEdits: company.settings?.allowManualEdits ?? true,
          requireManagerApproval: company.settings?.requireManagerApproval ?? false,
          workdayMaxHours: company.settings?.workdayMaxHours ?? 12,
          breakMaxMinutes: company.settings?.breakMaxMinutes ?? 90,
          notifyOnIncident: company.settings?.notifyOnIncident ?? true,
          notifyOnLateArrival: company.settings?.notifyOnLateArrival ?? true,
          lateArrivalThresholdMinutes: company.settings?.lateArrivalThresholdMinutes ?? 15,
        },
      });
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: () => api.patch('/companies/me', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const setS = (key: keyof CompanySettings['settings'], value: any) =>
    setForm((f) => ({ ...f, settings: { ...f.settings, [key]: value } }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
            <Settings size={18} className="text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Configuración</h1>
            <p className="text-sm text-slate-500">Ajustes generales de la empresa</p>
          </div>
        </div>
        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="btn-primary gap-2 text-sm"
        >
          {updateMutation.isPending
            ? <Loader2 size={14} className="animate-spin" />
            : saved
            ? <Check size={14} />
            : <Save size={14} />
          }
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>

      {/* Company info */}
      <div className={SECTION_CLASSES}>
        <div className={SECTION_TITLE_CLASSES}>
          <Building2 size={15} className="text-slate-500" />
          Información de empresa
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nombre de la empresa</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">NIF / CIF</label>
            <input
              className="input"
              value={form.taxId}
              onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
              placeholder="B12345678"
            />
          </div>
          <div>
            <label className="label">País</label>
            <select
              className="input"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            >
              <option value="ES">España</option>
              <option value="PT">Portugal</option>
              <option value="FR">Francia</option>
              <option value="DE">Alemania</option>
              <option value="GB">Reino Unido</option>
            </select>
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Dirección</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Timezone */}
      <div className={SECTION_CLASSES}>
        <div className={SECTION_TITLE_CLASSES}>
          <Globe size={15} className="text-slate-500" />
          Zona horaria y localización
        </div>
        <div>
          <label className="label">Zona horaria por defecto</label>
          <select
            className="input"
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          >
            <option value="Europe/Madrid">Europe/Madrid (CET/CEST)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
            <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
            <option value="America/New_York">America/New_York (ET)</option>
            <option value="America/Mexico_City">America/Mexico_City (CST)</option>
            <option value="America/Bogota">America/Bogota (COT)</option>
            <option value="America/Buenos_Aires">America/Buenos_Aires (ART)</option>
          </select>
        </div>
      </div>

      {/* Clock rules */}
      <div className={SECTION_CLASSES}>
        <div className={SECTION_TITLE_CLASSES}>
          <Shield size={15} className="text-slate-500" />
          Reglas de fichaje
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Horas máx. jornada</label>
            <input
              className="input"
              type="number"
              min={1}
              max={24}
              value={form.settings.workdayMaxHours}
              onChange={(e) => setS('workdayMaxHours', +e.target.value)}
            />
          </div>
          <div>
            <label className="label">Minutos máx. pausa</label>
            <input
              className="input"
              type="number"
              min={0}
              max={480}
              value={form.settings.breakMaxMinutes}
              onChange={(e) => setS('breakMaxMinutes', +e.target.value)}
            />
          </div>
          <div>
            <label className="label">Tolerancia geofence (m)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={500}
              value={form.settings.geofenceToleranceMeters}
              onChange={(e) => setS('geofenceToleranceMeters', +e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">Margen extra sobre el radio del centro</p>
          </div>
          <div>
            <label className="label">Umbral llegada tarde (min)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={120}
              value={form.settings.lateArrivalThresholdMinutes}
              onChange={(e) => setS('lateArrivalThresholdMinutes', +e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-4 pt-2">
          <ToggleField
            label="Permitir edición manual"
            description="Los administradores pueden corregir fichajes pasados"
            checked={form.settings.allowManualEdits}
            onChange={(v) => setS('allowManualEdits', v)}
          />
          <ToggleField
            label="Requerir aprobación de manager"
            description="Las correcciones manuales requieren aprobación"
            checked={form.settings.requireManagerApproval}
            onChange={(v) => setS('requireManagerApproval', v)}
          />
        </div>
      </div>

      {/* WhatsApp */}
      <div className={SECTION_CLASSES}>
        <div className={SECTION_TITLE_CLASSES}>
          <MessageSquare size={15} className="text-slate-500" />
          Integración WhatsApp
        </div>
        <ToggleField
          label="Habilitar fichaje por WhatsApp"
          description="Los empleados pueden fichar enviando mensajes de WhatsApp"
          checked={form.settings.whatsappEnabled}
          onChange={(v) => setS('whatsappEnabled', v)}
        />

        {form.settings.whatsappEnabled && (
          <div className="pl-0 space-y-3 pt-1">
            <div>
              <label className="label">Política de geolocalización en WhatsApp</label>
              <select
                className="input"
                value={form.settings.whatsappGeoPolicy}
                onChange={(e) => setS('whatsappGeoPolicy', e.target.value)}
              >
                <option value="REQUIRE">Requerir ubicación (obligatorio)</option>
                <option value="ALLOW_PENDING">Solicitar ubicación (continuar sin ella)</option>
                <option value="OPTIONAL">No solicitar ubicación</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                {form.settings.whatsappGeoPolicy === 'REQUIRE'
                  ? 'El fichaje queda pendiente hasta recibir la ubicación GPS.'
                  : form.settings.whatsappGeoPolicy === 'ALLOW_PENDING'
                  ? 'Se solicita la ubicación pero el fichaje se registra aunque no llegue.'
                  : 'No se solicita ni registra ubicación en fichajes por WhatsApp.'}
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-700 space-y-1">
              <p className="font-semibold">Configuración requerida en .env</p>
              <p className="font-mono">WHATSAPP_ACCESS_TOKEN=...</p>
              <p className="font-mono">WHATSAPP_PHONE_NUMBER_ID=...</p>
              <p className="font-mono">WHATSAPP_VERIFY_TOKEN=...</p>
            </div>
          </div>
        )}
      </div>

      {/* GPS */}
      <div className={SECTION_CLASSES}>
        <div className={SECTION_TITLE_CLASSES}>
          <MapPin size={15} className="text-slate-500" />
          Geolocalización
        </div>
        <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 space-y-1">
          <p>La configuración GPS se gestiona a nivel de <strong>centro de trabajo</strong>.</p>
          <p className="text-xs text-slate-400">
            Ve a Centros de trabajo para configurar el radio geofence, latitud/longitud y si se requiere GPS en cada centro.
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className={SECTION_CLASSES}>
        <div className={SECTION_TITLE_CLASSES}>
          <Bell size={15} className="text-slate-500" />
          Notificaciones
        </div>
        <div className="space-y-4">
          <ToggleField
            label="Notificar nuevas incidencias"
            description="Recibir alerta cuando se abra una incidencia"
            checked={form.settings.notifyOnIncident}
            onChange={(v) => setS('notifyOnIncident', v)}
          />
          <ToggleField
            label="Notificar llegadas tarde"
            description={`Alertar cuando un empleado ficha con más de ${form.settings.lateArrivalThresholdMinutes} min de retraso`}
            checked={form.settings.notifyOnLateArrival}
            onChange={(v) => setS('notifyOnLateArrival', v)}
          />
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border border-rose-100">
        <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm mb-3">
          <Shield size={15} />
          Zona de peligro
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Estas acciones son irreversibles. Contacta con soporte antes de proceder.
        </p>
        <button
          type="button"
          disabled
          className="text-sm text-rose-500 border border-rose-200 px-4 py-2 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-40"
        >
          Exportar y eliminar todos los datos
        </button>
      </div>
    </div>
  );
}
