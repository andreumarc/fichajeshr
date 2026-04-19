'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Cookies from 'js-cookie'

function roleHome(role?: string): string {
  switch (role) {
    case 'SUPERADMIN':    return '/superadmin/dashboard'
    case 'COMPANY_ADMIN':
    case 'HR':
    case 'MANAGER':       return '/admin/dashboard'
    case 'KIOSK':         return '/kiosk'
    default:              return '/dashboard'
  }
}

function SsoExchange() {
  const router   = useRouter()
  const params   = useSearchParams()
  const hubToken = params.get('hub_token')

  useEffect(() => {
    if (!hubToken) {
      router.replace('/login?error=missing_token')
      return
    }

    async function exchange() {
      try {
        const res = await fetch(
          `/api/v1/auth/hub-sso?hub_token=${encodeURIComponent(hubToken!)}`,
          { credentials: 'include' }
        )
        if (!res.ok) throw new Error('sso_failed')
        const json = await res.json()
        const accessToken  = json?.data?.accessToken  ?? json?.accessToken
        const refreshToken = json?.data?.refreshToken ?? json?.refreshToken
        const user         = json?.data?.user         ?? json?.user
        if (!accessToken || !user) throw new Error('no_token')

        const opts = { secure: true, sameSite: 'strict' as const }
        Cookies.set('access_token',  accessToken,          { ...opts, expires: 1 })
        if (refreshToken) Cookies.set('refresh_token', refreshToken, { ...opts, expires: 7 })
        Cookies.set('user',          JSON.stringify(user), { ...opts, expires: 1 })

        router.replace(roleHome(user?.role))
      } catch {
        router.replace('/login?error=sso_failed')
      }
    }
    exchange()
  }, [hubToken, router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
      <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Iniciando sesión…</p>
    </div>
  )
}

export default function SsoPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Cargando…</p>
      </div>
    }>
      <SsoExchange />
    </Suspense>
  )
}
