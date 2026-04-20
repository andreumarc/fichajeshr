// GET /api/sync/clinics — proxies to NestJS backend for Hub import
// POST /api/sync/clinics — proxies clinic upsert from Hub to backend
// Auth: Bearer HUB_JWT_SECRET
import { type NextRequest, NextResponse } from 'next/server'

function backendUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\\n$/, '')
  if (!raw) return null
  // NEXT_PUBLIC_API_URL already contains /api/v1 suffix
  return raw.replace(/\/+$/, '')
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.HUB_JWT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const base = backendUrl()
  if (!base) return NextResponse.json([], { status: 200 })
  try {
    const r = await fetch(`${base}/sync/clinics`, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(6000),
    })
    if (!r.ok) return NextResponse.json([], { status: 200 })
    return NextResponse.json(await r.json())
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.HUB_JWT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.text()
  const base = backendUrl()
  if (!base) return NextResponse.json({ ok: true, proxied: false })
  try {
    const r = await fetch(`${base}/sync/clinics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body,
      signal: AbortSignal.timeout(6000),
    })
    const data = await r.json().catch(() => ({}))
    return NextResponse.json(data, { status: r.status })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
