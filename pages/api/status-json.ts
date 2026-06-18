import { workerConfig } from '@/uptime.config'
import type { MonitorState } from '@/types/config'
import { getPublicStatusPayload } from '@/util/publicStatus'

export const runtime = 'edge'

export default async function handler(): Promise<Response> {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const stateStr = await UPTIMEFLARE_STATE?.get('state')
  if (!stateStr) {
    return Response.json({ error: 'No status data available' }, { status: 503 })
  }

  const state = JSON.parse(stateStr) as MonitorState
  return Response.json(getPublicStatusPayload(state, workerConfig.monitors), {
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
    },
  })
}
