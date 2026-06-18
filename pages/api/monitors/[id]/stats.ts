import type { KVNamespace } from '@cloudflare/workers-types'
import { NextRequest } from 'next/server'
import { workerConfig } from '@/uptime.config'
import type { MonitorState } from '@/types/config'
import {
  getMonitorIncidentAt,
  getMonitorLatencyStats,
  getMonitorUptimePercent,
  getMonitorWindowIncidents,
  pickLatencySeries,
} from '@/util/uptime'
import {
  parseTimeRange,
  timeRangeToDays,
  timeRangeToSeconds,
  type TimeRange,
} from '@/util/timeRange'

export const runtime = 'edge'

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

function overlapLen(x1: number, x2: number, y1: number, y2: number) {
  return Math.max(0, Math.min(x2, y2) - Math.max(x1, y1))
}

function getParam(req: NextRequest, name: string): string {
  const url = req.nextUrl ?? new URL(req.url)
  if (name === 'range') return url.searchParams.get('range') ?? ''
  if (name === 'id') {
    const parts = url.pathname.split('/').filter(Boolean)
    const monitorIndex = parts.indexOf('monitors')
    return monitorIndex >= 0 ? decodeURIComponent(parts[monitorIndex + 1] ?? '') : ''
  }
  return ''
}

function buildUptimeBars(state: MonitorState, monitorId: string, range: TimeRange) {
  const now = Math.floor(Date.now() / 1000)
  const windowSec = timeRangeToSeconds(range)
  const from = now - windowSec

  if (range === '24h') {
    const recent = state.latency[monitorId]?.recent ?? []
    return recent
      .filter((sample) => sample.time >= from)
      .map((sample) => ({
        time: sample.time,
        up: sample.up ?? !getMonitorIncidentAt(state, monitorId, sample.time),
        ping: sample.ping,
        location: sample.loc,
      }))
  }

  const days = timeRangeToDays(range)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartSec = Math.floor(todayStart.getTime() / 1000)
  const incidents = state.incident[monitorId] ?? []

  return Array.from({ length: days }, (_, index) => {
    const dayStart = todayStartSec - (days - 1 - index) * 86400
    const dayEnd = dayStart + 86400
    const monitorTime = overlapLen(dayStart, dayEnd, from, now)
    let downTime = 0

    for (const incident of incidents) {
      if (incident.error?.[0] === 'dummy') continue
      if (incident.severity === 'maintenance' || incident.severity === 'false_positive') continue
      downTime += overlapLen(dayStart, dayEnd, incident.start[0], incident.end ?? now)
    }

    const uptime = monitorTime > 0 ? ((monitorTime - downTime) / monitorTime) * 100 : null
    return { dayStart, uptime }
  })
}

export default async function handler(req: NextRequest): Promise<Response> {
  const id = getParam(req, 'id')
  const range = parseTimeRange(getParam(req, 'range') || '24h')
  const monitor = workerConfig.monitors.find((item) => item?.id === id)

  if (!monitor) return json({ error: 'Monitor not found' }, { status: 404 })

  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const stateStr = await UPTIMEFLARE_STATE?.get('state')
  if (!stateStr) return json({ error: 'No data available' }, { status: 503 })

  const state = JSON.parse(stateStr) as MonitorState
  const windowSec = timeRangeToSeconds(range)
  const latency = state.latency[id]
  const useRecent = range === '24h'
  const series = pickLatencySeries(latency, useRecent)
  const cutoff = Math.floor(Date.now() / 1000) - windowSec
  const responseSeries = series
    .filter((sample) => sample.time >= cutoff)
    .map((sample) => ({
      time: sample.time,
      ping: sample.ping,
      location: sample.loc,
      up: sample.up,
    }))
  const incidents = getMonitorWindowIncidents(state, id, windowSec)

  return json(
    {
      monitor: {
        id: monitor.id,
        name: monitor.name,
        method: monitor.method ?? 'GET',
      },
      range,
      generatedAt: new Date().toISOString(),
      currentResponseMs: latency?.recent?.[latency.recent.length - 1]?.ping ?? null,
      uptimePercent: getMonitorUptimePercent(state, id, windowSec),
      latencyStats: getMonitorLatencyStats(state, id, windowSec, useRecent),
      incidentCount: incidents.length,
      incidents: incidents.map((incident) => ({
        startedAt: new Date(incident.start[0] * 1000).toISOString(),
        resolvedAt: incident.end ? new Date(incident.end * 1000).toISOString() : null,
        severity: incident.severity ?? 'outage',
        reason: incident.error[incident.error.length - 1] ?? null,
      })),
      uptimeBars: buildUptimeBars(state, id, range),
      responseSeries,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
      },
    }
  )
}
