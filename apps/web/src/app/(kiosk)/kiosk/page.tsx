'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { KioskWelcome } from '@/components/kiosk/KioskWelcome';
import { KioskIdentify } from '@/components/kiosk/KioskIdentify';
import { KioskAction } from '@/components/kiosk/KioskAction';
import { KioskSuccess } from '@/components/kiosk/KioskSuccess';

export type KioskStep = 'welcome' | 'identify' | 'action' | 'success';

export interface IdentifiedEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  workCenterId?: string;
  workCenterName?: string;
  currentStatus: string;
  lastEntry?: { type: string; timestamp: string } | null;
}

export interface ClockResult {
  success: boolean;
  type: string;
  timestamp: string;
  status: string;
  isWithinZone?: boolean;
  firstName?: string;
}

// Company ID is configured per kiosk device
// In production this would come from device config / URL param / env
const COMPANY_ID = process.env.NEXT_PUBLIC_KIOSK_COMPANY_ID ?? '';
const AUTO_RESET_SECONDS = 10;

export default function KioskPage() {
  const [step, setStep] = useState<KioskStep>('welcome');
  const [employee, setEmployee] = useState<IdentifiedEmployee | null>(null);
  const [clockResult, setClockResult] = useState<ClockResult | null>(null);
  const [companyId, setCompanyId] = useState(COMPANY_ID);
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetKiosk = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('welcome');
    setEmployee(null);
    setClockResult(null);
    setCountdown(AUTO_RESET_SECONDS);
  }, []);

  // Auto-reset countdown after success
  useEffect(() => {
    if (step === 'success') {
      setCountdown(AUTO_RESET_SECONDS);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            resetKiosk();
            return AUTO_RESET_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, resetKiosk]);

  // Read companyId from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('company');
    if (cid) setCompanyId(cid);
  }, []);

  const handleIdentified = (emp: IdentifiedEmployee) => {
    setEmployee(emp);
    setStep('action');
  };

  const handleClockSuccess = (result: ClockResult) => {
    setClockResult(result);
    setStep('success');
  };

  return (
    <div
      className="kiosk-mode min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center"
      onDoubleClick={(e) => {
        // Double-click top-right corner to access config
        const rect = (e.target as HTMLElement).closest('body')!.getBoundingClientRect();
        if (e.clientX > window.innerWidth - 100 && e.clientY < 100) {
          const newId = prompt('Company ID:');
          if (newId) setCompanyId(newId);
        }
      }}
    >
      <div className="w-full max-w-md mx-4">
        {step === 'welcome' && (
          <KioskWelcome companyId={companyId} onStart={() => setStep('identify')} />
        )}
        {step === 'identify' && (
          <KioskIdentify
            companyId={companyId}
            onIdentified={handleIdentified}
            onBack={resetKiosk}
          />
        )}
        {step === 'action' && employee && (
          <KioskAction
            employee={employee}
            companyId={companyId}
            onSuccess={handleClockSuccess}
            onBack={() => setStep('identify')}
          />
        )}
        {step === 'success' && clockResult && employee && (
          <KioskSuccess
            result={clockResult}
            employee={employee}
            countdown={countdown}
            onReset={resetKiosk}
          />
        )}
      </div>
    </div>
  );
}
