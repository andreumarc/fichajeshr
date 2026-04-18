'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';

const BRAND  = '#003A70';
const ACCENT = '#00A99D';

function SsoHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const hubToken = searchParams.get('hub_token');

    if (!hubToken) {
      router.replace('/login?error=missing_hub_token');
      return;
    }

    (async () => {
      try {
        const { data } = await api.get('/auth/hub-sso', {
          params: { hub_token: hubToken },
        });

        const { accessToken, refreshToken, user, mustChangePassword } = data;

        const opts = { secure: true, sameSite: 'strict' as const };
        Cookies.set('access_token',  accessToken,          { ...opts, expires: 1 });
        Cookies.set('refresh_token', refreshToken,         { ...opts, expires: 7 });
        Cookies.set('user',          JSON.stringify(user), { ...opts, expires: 1 });

        if (mustChangePassword) {
          router.replace('/set-password');
          return;
        }

        const role = user?.role ?? '';
        if (role === 'SUPERADMIN') {
          router.replace('/superadmin/dashboard');
        } else if (['COMPANY_ADMIN', 'HR', 'MANAGER'].includes(role)) {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/dashboard');
        }
      } catch {
        router.replace('/login?error=sso_failed');
      }
    })();
  }, [router, searchParams]);

  return null;
}

/**
 * SSO landing page for ImpulsoDent Hub.
 * Receives ?hub_token=xxx, exchanges it for app tokens, then redirects.
 */
export default function SsoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <div
          className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin mx-auto"
          style={{ borderColor: `${ACCENT} transparent transparent transparent` }}
        />
        <p className="text-sm font-medium" style={{ color: BRAND }}>
          Iniciando sesión...
        </p>
        <p className="text-xs text-gray-400">
          Redirigiendo desde ImpulsoDent Hub
        </p>
      </div>
      <Suspense fallback={null}>
        <SsoHandler />
      </Suspense>
    </div>
  );
}
