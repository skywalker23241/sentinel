import { NextRequest } from 'next/server'
import { workerConfig } from '@/uptime.config'
import type { MonitorState } from '@/types/config'
import { getPublicIncidents } from '@/util/publicStatus'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const stateStr = await UPTIMEFLARE_STATE?.get('state')
  if (!stateStr) {
    return Response.json({ error: 'No incident data available' }, { status: 503 })
  }

  const rawLimit = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(100, Math.max(1, Number(rawLimit ?? 50)))
  const state = JSON.parse(stateStr) as MonitorState
  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      incidents: getPublicIncidents(state, workerConfig.monitors).slice(0, limit),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      },
    }
  )
}
