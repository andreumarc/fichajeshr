'use client';
import { Fingerprint } from 'lucide-react';
import { ImpulsoDentIcon } from '@/components/ImpulsoDentIcon';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useEffect, useState } from 'react';

dayjs.locale('es');

interface Props {
  companyId: string;
  onStart: () => void;
}

export function KioskWelcome({ companyId, onStart }: Props) {
  const [time, setTime] = useState(dayjs().format('HH:mm'));
  const [secs, setSecs] = useState(dayjs().format('ss'));

  useEffect(() => {
    const t = setInterval(() => {
      setTime(dayjs().format('HH:mm'));
      setSecs(dayjs().format('ss'));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-between h-full text-white animate-fade-in px-8 py-12">
      {/* Top: logo */}
      <div className="flex items-center gap-3 self-start">
        <ImpulsoDentIcon size={40} bg="rgba(255,255,255,0.15)" />
        <div>
          <p className="font-bold text-white text-base leading-none">Terminal Fichaje</p>
          <p className="text-white/50 text-xs mt-0.5">Control de presencia</p>
        </div>
      </div>

      {/* Center: clock */}
      <div className="text-center space-y-3">
        <div className="flex items-end justify-center gap-2">
          <p className="text-[7rem] font-bold font-mono leading-none tracking-tighter tabular-nums">
            {time}
          </p>
          <p className="text-3xl font-mono text-white/40 mb-4 tabular-nums">{secs}</p>
        </div>
        <p className="text-white/60 text-lg capitalize font-medium">
          {dayjs().format('dddd, D [de] MMMM [de] YYYY')}
        </p>
      </div>

      {/* CTA */}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={onStart}
          className="w-full py-7 bg-white text-indigo-900 rounded-3xl font-bold text-2xl
                     hover:bg-indigo-50 active:scale-[.97] transition-all shadow-2xl shadow-black/30
                     touch-manipulation flex flex-col items-center gap-2"
        >
          <Fingerprint size={40} strokeWidth={1.5} />
          FICHAR AHORA
        </button>

        {!companyId && (
          <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/20 border border-rose-400/30 rounded-2xl">
            <span className="w-2 h-2 bg-rose-400 rounded-full flex-shrink-0" />
            <p className="text-rose-200 text-sm">
              Configuración pendiente — doble clic en la esquina superior izquierda
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
