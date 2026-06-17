import { workerConfig } from '@/uptime.config'
import { MonitorState } from '@/types/config'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const stateStr = await UPTIMEFLARE_STATE?.get('state')
  if (!stateStr) {
    return new Response(JSON.stringify({ error: 'No data available' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  const state = JSON.parse(stateStr) as unknown as MonitorState

  let monitors: any = {}

  for (let monitor of workerConfig.monitors) {
    const incidents = state.incident[monitor.id] ?? []
    const lastIncident = incidents[incidents.length - 1]
    const recent = state.latency[monitor.id]?.recent ?? []
    const lastSample = recent[recent.length - 1]
    // A monitor is up when it has no open incident.
    const isUp = !lastIncident || lastIncident.end !== undefined
    monitors[monitor.id] = {
      up: isUp,
      latency: lastSample?.ping ?? null,
      location: lastSample?.loc ?? null,
      message: isUp ? 'OK' : lastIncident.error[lastIncident.error.length - 1] ?? 'down',
    }
  }

  let ret = {
    up: state.overallUp,
    down: state.overallDown,
    updatedAt: state.lastUpdate,
    monitors: monitors,
  }

  return new Response(JSON.stringify(ret), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
