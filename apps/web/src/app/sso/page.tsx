'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function SsoPage({
  searchParams,
}: {
  searchParams: { hub_token?: string }
}) {
  const router = useRouter()
  const hubToken = searchParams.hub_token

  useEffect(() => {
    if (!hubToken) { router.replace('/login?error=missing_token'); return }

    async function exchange() {
      try {
        const res = await fetch(
          `${API_URL}/api/v1/auth/hub-sso?hub_token=${encodeURIComponent(hubToken!)}`,
          { credentials: 'include' }
        )
        if (!res.ok) throw new Error('sso_failed')
        const json = await res.json()
        const accessToken = json?.data?.accessToken ?? json?.accessToken
        if (!accessToken) throw new Error('no_token')
        localStorage.setItem('accessToken', accessToken)
        router.replace('/dashboard')
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
