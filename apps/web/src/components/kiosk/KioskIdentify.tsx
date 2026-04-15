'use client';
import { useState, useRef, useEffect } from 'react';
import { Hash, Lock, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { kioskApi } from '@/lib/api';
import type { IdentifiedEmployee } from '@/app/(kiosk)/kiosk/page';

interface Props {
  companyId: string;
  onIdentified: (employee: IdentifiedEmployee) => void;
  onBack: () => void;
}

type Mode = 'select_method' | 'pin_input' | 'code_input';

export function KioskIdentify({ companyId, onIdentified, onBack }: Props) {
  const [mode,         setMode]         = useState<Mode>('select_method');
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin,          setPin]          = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((mode === 'pin_input' || mode === 'code_input') && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [mode]);

  const reset = () => { setMode('select_method'); setError(''); setPin(''); setEmployeeCode(''); };

  const identify = async () => {
    if (!employeeCode.trim()) { setError('Introduce tu código de empleado'); return; }
    if (mode === 'pin_input' && pin.length < 4) { setError('El PIN debe tener al menos 4 dígitos'); return; }
    setLoading(true); setError('');
    try {
      const client = kioskApi(companyId);
      const { data } = await client.post('/kiosk/identify', {
        method:       mode === 'pin_input' ? 'PIN' : 'EMPLOYEE_CODE',
        employeeCode: employeeCode.toUpperCase().trim(),
        pin:          mode === 'pin_input' ? pin : undefined,
      });
      onIdentified(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Código o PIN incorrecto');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinKey = (key: string) => {
    if (key === 'DEL') setPin((p) => p.slice(0, -1));
    else if (pin.length < 8) setPin((p) => p + key);
  };

  /* ── Method selection ───────────────────────── */
  if (mode === 'select_method') {
    return (
      <div className="text-white animate-fade-in h-full flex flex-col">
        <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white mb-8 text-sm font-medium transition-colors self-start">
          <ArrowLeft size={16} /> Volver
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-bold">Identifícate</h2>
          <p className="text-white/50 mt-1">Selecciona el método de acceso</p>
        </div>

        <div className="space-y-3 flex-1">
          {[
            {
              mode: 'pin_input' as Mode,
              icon: Lock,
              iconBg: 'bg-indigo-500',
              title: 'Código + PIN',
              desc: 'Introduce tu código y PIN personal',
            },
            {
              mode: 'code_input' as Mode,
              icon: Hash,
              iconBg: 'bg-emerald-600',
              title: 'Solo código',
              desc: 'Introduce únicamente tu código de empleado',
            },
          ].map(({ mode: m, icon: Icon, iconBg, title, desc }) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="w-full p-5 glass rounded-2xl flex items-center gap-5 text-left
                         transition-all active:scale-[.98] touch-manipulation hover:bg-white/15"
            >
              <div className={`w-13 h-13 w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <Icon size={26} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-lg text-white">{title}</p>
                <p className="text-white/50 text-sm mt-0.5">{desc}</p>
              </div>
              <div className="ml-auto text-white/30">›</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Code / PIN input ───────────────────────── */
  return (
    <div className="text-white animate-fade-in h-full flex flex-col">
      <button onClick={reset} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm font-medium transition-colors self-start">
        <ArrowLeft size={16} /> Volver
      </button>

      <h2 className="text-2xl font-bold mb-6">
        {mode === 'pin_input' ? 'Código + PIN' : 'Código de empleado'}
      </h2>

      {error && (
        <div className="flex items-center gap-3 glass border-rose-500/30 bg-rose-500/15 rounded-2xl p-4 mb-4">
          <AlertCircle size={18} className="text-rose-300 flex-shrink-0" />
          <p className="text-rose-200 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Code field */}
      <div className="mb-4">
        <label className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2 block">
          Código de empleado
        </label>
        <input
          ref={codeInputRef}
          type="text"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && mode === 'code_input' && identify()}
          placeholder="EMP-001"
          autoComplete="off"
          className="w-full glass rounded-2xl px-5 py-4 text-white text-xl font-mono uppercase
                     placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
        />
      </div>

      {/* PIN numpad */}
      {mode === 'pin_input' && (
        <div className="mb-4">
          <label className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2 block">
            PIN personal
          </label>
          {/* Dots */}
          <div className="flex justify-center gap-3 py-4 mb-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                i < pin.length ? 'bg-white scale-110 shadow-lg shadow-white/40' : 'bg-white/20'
              }`} />
            ))}
          </div>
          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5">
            {['1','2','3','4','5','6','7','8','9','','0','DEL'].map((key, idx) => (
              <button
                key={idx}
                onClick={() => key && handlePinKey(key)}
                disabled={!key}
                className={`py-5 rounded-2xl font-bold text-2xl transition-all active:scale-90 touch-manipulation select-none ${
                  key === 'DEL'
                    ? 'bg-rose-500/25 hover:bg-rose-500/40 text-rose-200'
                    : key === ''
                    ? 'invisible pointer-events-none'
                    : 'glass hover:bg-white/20 text-white'
                }`}
              >
                {key === 'DEL' ? '⌫' : key}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={identify}
        disabled={loading || !employeeCode}
        className="w-full mt-auto py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-2xl
                   font-bold text-xl transition-all active:scale-[.98] flex items-center justify-center gap-3
                   touch-manipulation shadow-lg shadow-indigo-900/50"
      >
        {loading ? <><Loader2 className="animate-spin" size={22} />Verificando...</> : 'Continuar →'}
      </button>
    </div>
  );
}
