'use client';
import { Check, AlertTriangle, Users } from 'lucide-react';
import dayjs from 'dayjs';
import type { IdentifiedEmployee, ClockResult } from '@/app/(kiosk)/kiosk/page';

interface Props {
  result: ClockResult;
  employee: IdentifiedEmployee;
  countdown: number;
  onReset: () => void;
}

const typeConfig: Record<string, { label: string; bg: string; ring: string; glow: string }> = {
  CHECK_IN:    { label: 'ENTRADA registrada',  bg: 'bg-emerald-500',   ring: 'ring-emerald-400/40', glow: 'shadow-emerald-500/50' },
  CHECK_OUT:   { label: 'SALIDA registrada',   bg: 'bg-rose-500',      ring: 'ring-rose-400/40',    glow: 'shadow-rose-500/50' },
  BREAK_START: { label: 'PAUSA iniciada',      bg: 'bg-amber-500',     ring: 'ring-amber-400/40',   glow: 'shadow-amber-500/50' },
  BREAK_END:   { label: 'PAUSA finalizada',    bg: 'bg-indigo-500',    ring: 'ring-indigo-400/40',  glow: 'shadow-indigo-500/50' },
};

export function KioskSuccess({ result, employee, countdown, onReset }: Props) {
  const cfg       = typeConfig[result.type] ?? typeConfig.CHECK_IN;
  const outOfZone = result.isWithinZone === false;

  return (
    <div className="text-white text-center animate-fade-in h-full flex flex-col items-center justify-between py-4">
      {/* Icon */}
      <div className={`w-32 h-32 ${cfg.bg} rounded-full flex items-center justify-center mx-auto
                       ring-8 ${cfg.ring} shadow-2xl ${cfg.glow}`}>
        <Check size={60} strokeWidth={2.5} className="text-white" />
      </div>

      {/* Content */}
      <div className="space-y-3 flex-1 flex flex-col items-center justify-center">
        <p className={`text-sm font-bold uppercase tracking-widest ${cfg.bg.replace('bg-', 'text-').replace('-500', '-300')}`}>
          {cfg.label}
        </p>
        <h2 className="text-4xl font-bold leading-tight">
          {employee.firstName} {employee.lastName}
        </h2>
        <p className="text-5xl font-mono font-bold tabular-nums text-white/90">
          {dayjs(result.timestamp).format('HH:mm')}
        </p>
        <p className="text-white/40 text-sm">
          {dayjs(result.timestamp).format('dddd, D [de] MMMM')}
        </p>

        {outOfZone && (
          <div className="flex items-center gap-2.5 glass bg-amber-500/15 border-amber-400/30 rounded-2xl px-5 py-3.5 mt-2">
            <AlertTriangle size={18} className="text-amber-300 flex-shrink-0" />
            <p className="text-amber-200 text-sm text-left">
              Fichaje fuera de zona. Se ha generado una incidencia automática.
            </p>
          </div>
        )}
      </div>

      {/* Countdown + CTA */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between text-white/40 text-xs px-1">
          <span>Siguiente empleado en {countdown}s</span>
          <span>{countdown}s</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/40 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 10) * 100}%` }}
          />
        </div>

        <button
          onClick={onReset}
          className="w-full py-5 glass hover:bg-white/20 border-white/20 rounded-2xl font-bold text-lg
                     transition-all active:scale-[.98] touch-manipulation flex items-center justify-center gap-2"
        >
          <Users size={20} />
          Siguiente empleado
        </button>
      </div>
    </div>
  );
}
