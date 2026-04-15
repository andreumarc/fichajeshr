'use client';
import { useState, useEffect } from 'react';
import { LogIn, LogOut, Coffee, Play, AlertCircle, Loader2, MapPin, MapPinOff, CheckCircle2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import api from '@/lib/api';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

type ClockStatus = 'NOT_CLOCKED_IN' | 'WORKING' | 'ON_BREAK' | 'CLOCKED_OUT';

interface ClockInButtonProps {
  status: ClockStatus;
  onSuccess: (result: any) => void;
  workCenterId?: string;
}

const statusConfig: Record<ClockStatus, { label: string; dot: string; pill: string }> = {
  NOT_CLOCKED_IN: { label: 'Sin fichar',        dot: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-600' },
  WORKING:        { label: 'Trabajando',         dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700' },
  ON_BREAK:       { label: 'En pausa',           dot: 'bg-amber-500',   pill: 'bg-amber-100 text-amber-700' },
  CLOCKED_OUT:    { label: 'Jornada finalizada', dot: 'bg-indigo-500',  pill: 'bg-indigo-100 text-indigo-700' },
};

export function ClockInButton({ status, onSuccess, workCenterId }: ClockInButtonProps) {
  const { getPosition, loading: geoLoading, error: geoError } = useGeolocation();
  const [loading, setLoading] = useState<string | null>(null);
  const [result,  setResult]  = useState<any>(null);
  const [error,   setError]   = useState('');
  const [time,    setTime]    = useState(dayjs().format('HH:mm'));

  useEffect(() => {
    const t = setInterval(() => setTime(dayjs().format('HH:mm')), 10_000);
    return () => clearInterval(t);
  }, []);

  const cfg = statusConfig[status];

  const doAction = async (type: string, endpoint: string) => {
    setLoading(type);
    setError('');
    setResult(null);
    try {
      let geo = {};
      try {
        const pos = await getPosition();
        geo = { latitude: pos.latitude, longitude: pos.longitude, accuracy: pos.accuracy };
      } catch { /* Allow without GPS */ }

      const res = await api.post(`/time-entries/${endpoint}`, {
        ...geo, workCenterId, deviceType: 'WEB_BROWSER', clockMethod: 'EMAIL_PASSWORD',
      });
      setResult(res.data);
      onSuccess(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al registrar fichaje');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Status pill */}
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium ${cfg.pill}`}>
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status === 'WORKING' ? 'animate-pulse' : ''}`} />
          {cfg.label}
        </div>
        {/* GPS indicator */}
        <div className={`flex items-center gap-1.5 text-xs ${geoError ? 'text-amber-500' : 'text-emerald-600'}`}>
          {geoError
            ? <><MapPinOff size={13} /><span>Sin GPS</span></>
            : <><MapPin size={13} /><span>{geoLoading ? 'Localizando…' : 'GPS activo'}</span></>
          }
        </div>
      </div>

      {/* Clock display */}
      <div className="text-center py-6">
        <p className="text-6xl font-bold text-slate-900 tabular-nums tracking-tight">
          {time}
        </p>
        <p className="text-slate-500 text-sm mt-2 capitalize">
          {dayjs().format('dddd, D [de] MMMM [de] YYYY')}
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        {(status === 'NOT_CLOCKED_IN' || status === 'CLOCKED_OUT') && (
          <button
            onClick={() => doAction('CHECK_IN', 'clock-in')}
            disabled={!!loading}
            className="btn-success col-span-2 py-4 text-base rounded-2xl"
          >
            {loading === 'CHECK_IN'
              ? <Loader2 className="animate-spin" size={20} />
              : <LogIn size={20} />
            }
            Fichar entrada
          </button>
        )}

        {status === 'WORKING' && (
          <>
            <button
              onClick={() => doAction('BREAK_START', 'break-start')}
              disabled={!!loading}
              className="btn py-4 text-sm rounded-2xl bg-amber-500 text-white hover:bg-amber-600 active:scale-[.98] shadow-sm shadow-amber-200"
            >
              {loading === 'BREAK_START' ? <Loader2 className="animate-spin" size={18} /> : <Coffee size={18} />}
              Iniciar pausa
            </button>
            <button
              onClick={() => doAction('CHECK_OUT', 'clock-out')}
              disabled={!!loading}
              className="btn-danger py-4 text-sm rounded-2xl"
            >
              {loading === 'CHECK_OUT' ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
              Fichar salida
            </button>
          </>
        )}

        {status === 'ON_BREAK' && (
          <button
            onClick={() => doAction('BREAK_END', 'break-end')}
            disabled={!!loading}
            className="btn-primary col-span-2 py-4 text-base rounded-2xl"
          >
            {loading === 'BREAK_END' ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
            Retomar trabajo
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-emerald-800 font-semibold text-sm">Fichaje registrado</p>
            <p className="text-emerald-600 text-xs mt-0.5">
              {dayjs(result.timestamp).format('HH:mm:ss')}
              {result.isWithinZone === false && (
                <span className="ml-2 text-amber-600">· Fuera de zona</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
