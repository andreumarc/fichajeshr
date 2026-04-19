import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.HUB_JWT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { hub_token } = await request.json()
  if (!hub_token) return NextResponse.json({ error: 'hub_token required' }, { status: 400 })

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return NextResponse.json({ error: 'API_URL not configured' }, { status: 500 })

  // Call NestJS hub-sso endpoint to create/upsert user
  try {
    await fetch(`${apiUrl}/api/v1/auth/hub-sso?hub_token=${encodeURIComponent(hub_token)}`, {
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true })
}
