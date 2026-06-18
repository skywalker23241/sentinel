import { workerConfig } from '@/uptime.config'

export const runtime = 'edge'

export default async function handler(): Promise<Response> {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  let kvReadable = false
  let updatedAt: string | null = null

  try {
    const stateStr = await UPTIMEFLARE_STATE?.get('state')
    kvReadable = !!stateStr
    if (stateStr) {
      const state = JSON.parse(stateStr) as { lastUpdate?: number }
      updatedAt = state.lastUpdate ? new Date(state.lastUpdate * 1000).toISOString() : null
    }
  } catch {
    kvReadable = false
  }

  return Response.json(
    {
      ok: true,
      service: 'status-page',
      kvReadable,
      monitorCount: workerConfig.monitors.length,
      updatedAt,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
