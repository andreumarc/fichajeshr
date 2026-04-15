'use client';
import { useState } from 'react';
import { LogIn, LogOut, Coffee, Play, ArrowLeft, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { kioskApi } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { IdentifiedEmployee, ClockResult } from '@/app/(kiosk)/kiosk/page';

interface Props {
  employee: IdentifiedEmployee;
  companyId: string;
  onSuccess: (result: ClockResult) => void;
  onBack: () => void;
}

const statusConfig: Record<string, { label: string; dot: string }> = {
  NOT_CLOCKED_IN: { label: 'Sin fichar hoy',     dot: 'bg-slate-400' },
  WORKING:        { label: 'Trabajando',          dot: 'bg-emerald-400 animate-pulse' },
  ON_BREAK:       { label: 'En pausa',            dot: 'bg-amber-400' },
  CLOCKED_OUT:    { label: 'Jornada finalizada',  dot: 'bg-indigo-400' },
};

export function KioskAction({ employee, companyId, onSuccess, onBack }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState('');
  const { getPosition } = useGeolocation();

  const doAction = async (type: string) => {
    setLoading(type); setError('');
    try {
      let geo: any = {};
      try { const pos = await getPosition(); geo = { latitude: pos.latitude, longitude: pos.longitude, accuracy: pos.accuracy }; } catch {}
      const { data } = await kioskApi(companyId).post('/kiosk/clock', {
        employeeId:           employee.employeeId,
        type,
        workCenterId:         employee.workCenterId,
        identificationMethod: 'PIN',
        ...geo,
      });
      onSuccess({ ...data, firstName: employee.firstName });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al fichar. Inténtalo de nuevo.');
    } finally {
      setLoading(null);
    }
  };

  const { currentStatus } = employee;
  const scfg = statusConfig[currentStatus] ?? statusConfig.NOT_CLOCKED_IN;
  const initials = `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="text-white animate-fade-in h-full flex flex-col">
      <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm font-medium transition-colors self-start">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Employee card */}
      <div className="glass rounded-3xl p-6 mb-6 text-center">
        <div className="w-20 h-20 bg-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl font-bold ring-2 ring-white/20">
          {initials}
        </div>
        <h2 className="text-2xl font-bold">Hola, {employee.firstName}</h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`w-2 h-2 rounded-full ${scfg.dot}`} />
          <span className="text-white/60 text-sm">{scfg.label}</span>
        </div>
        {employee.workCenterName && (
          <p className="text-white/40 text-xs mt-1.5 flex items-center justify-center gap-1">
            <MapPin size={11} /> {employee.workCenterName}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 glass bg-rose-500/15 border-rose-500/30 rounded-2xl p-4 mb-4">
          <AlertCircle size={18} className="text-rose-300 flex-shrink-0" />
          <p className="text-rose-200 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {(currentStatus === 'NOT_CLOCKED_IN' || currentStatus === 'CLOCKED_OUT') && (
          <button
            onClick={() => doAction('CHECK_IN')}
            disabled={!!loading}
            className="kiosk-btn w-full py-8 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40"
          >
            {loading === 'CHECK_IN' ? <Loader2 className="animate-spin" size={40} /> : <LogIn size={40} strokeWidth={1.5} />}
            <span className="text-3xl">ENTRADA</span>
          </button>
        )}

        {currentStatus === 'WORKING' && (
          <>
            <button
              onClick={() => doAction('BREAK_START')}
              disabled={!!loading}
              className="kiosk-btn w-full py-6 bg-amber-500 hover:bg-amber-400 text-white shadow-amber-900/40"
            >
              {loading === 'BREAK_START' ? <Loader2 className="animate-spin" size={32} /> : <Coffee size={32} strokeWidth={1.5} />}
              <span className="text-2xl">INICIAR PAUSA</span>
            </button>
            <button
              onClick={() => doAction('CHECK_OUT')}
              disabled={!!loading}
              className="kiosk-btn w-full py-6 bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40"
            >
              {loading === 'CHECK_OUT' ? <Loader2 className="animate-spin" size={32} /> : <LogOut size={32} strokeWidth={1.5} />}
              <span className="text-2xl">SALIDA</span>
            </button>
          </>
        )}

        {currentStatus === 'ON_BREAK' && (
          <>
            <button
              onClick={() => doAction('BREAK_END')}
              disabled={!!loading}
              className="kiosk-btn w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40"
            >
              {loading === 'BREAK_END' ? <Loader2 className="animate-spin" size={32} /> : <Play size={32} strokeWidth={1.5} />}
              <span className="text-2xl">FIN PAUSA</span>
            </button>
            <button
              onClick={() => doAction('CHECK_OUT')}
              disabled={!!loading}
              className="kiosk-btn w-full py-6 bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40"
            >
              {loading === 'CHECK_OUT' ? <Loader2 className="animate-spin" size={32} /> : <LogOut size={32} strokeWidth={1.5} />}
              <span className="text-2xl">SALIDA</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
