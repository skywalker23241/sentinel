import type { IncidentSeverity, MonitorState, MonitorTarget } from '@/types/config'
import { maintenances, pageConfig } from '@/uptime.config'
import {
  getDashboardKpis,
  getMonitorLatencyStats,
  getMonitorUptimePercent,
  isMonitorDown,
} from '@/util/uptime'

export type PublicIncident = {
  id: string
  monitorId: string
  monitorName: string
  title: string
  severity: IncidentSeverity
  status: 'ongoing' | 'resolved'
  startedAt: string
  resolvedAt: string | null
  durationSeconds: number | null
  reason: string
}

function isoFromUnix(sec: number): string {
  return new Date(sec * 1000).toISOString()
}

function currentWindowSeconds(window: '24h' | '7d' | '30d' | '90d') {
  switch (window) {
    case '24h':
      return 24 * 60 * 60
    case '7d':
      return 7 * 24 * 60 * 60
    case '30d':
      return 30 * 24 * 60 * 60
    case '90d':
    default:
      return 90 * 24 * 60 * 60
  }
}

export function getPublicIncidents(
  state: MonitorState,
  monitors: Pick<MonitorTarget, 'id' | 'name'>[]
): PublicIncident[] {
  const monitorNameById = new Map(monitors.map((monitor) => [monitor.id, monitor.name]))
  const now = Math.floor(Date.now() / 1000)
  const incidents: PublicIncident[] = []

  for (const monitor of monitors) {
    for (const incident of state.incident[monitor.id] ?? []) {
      if (incident.error?.[0] === 'dummy') continue
      const start = incident.start[0]
      const end = incident.end
      const severity = incident.severity ?? 'outage'
      incidents.push({
        id: `${monitor.id}-${start}`,
        monitorId: monitor.id,
        monitorName: monitorNameById.get(monitor.id) ?? monitor.id,
        title: incident.title ?? `${monitorNameById.get(monitor.id) ?? monitor.id} incident`,
        severity,
        status: end === undefined ? 'ongoing' : 'resolved',
        startedAt: isoFromUnix(start),
        resolvedAt: end ? isoFromUnix(end) : null,
        durationSeconds: end ? Math.max(0, end - start) : Math.max(0, now - start),
        reason: incident.error[incident.error.length - 1] ?? 'unspecified',
      })
    }
  }

  return incidents.sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)
  )
}

export function getPublicStatusPayload(state: MonitorState, monitors: MonitorTarget[]) {
  const windows = ['24h', '7d', '30d', '90d'] as const
  const kpis = getDashboardKpis(state, monitors, currentWindowSeconds('30d'))
  const incidents = getPublicIncidents(state, monitors)
  const activeMaintenances = maintenances.filter((maintenance) => {
    const now = Date.now()
    const start = new Date(maintenance.start).getTime()
    const end = maintenance.end ? new Date(maintenance.end).getTime() : Number.POSITIVE_INFINITY
    return now >= start && now <= end
  })

  return {
    page: {
      title: pageConfig.title ?? 'Status Page',
      generatedAt: new Date().toISOString(),
      updatedAt: isoFromUnix(state.lastUpdate),
    },
    summary: {
      status:
        kpis.total === 0
          ? 'unknown'
          : kpis.operational === kpis.total
          ? 'operational'
          : kpis.operational === 0
          ? 'major_outage'
          : 'partial_outage',
      operational: kpis.operational,
      total: kpis.total,
      avgUptime30d: kpis.avgUptimePercent,
      avgLatencyMs: kpis.avgLatencyMs,
      activeIncidentCount: incidents.filter((incident) => incident.status === 'ongoing').length,
      activeMaintenanceCount: activeMaintenances.length,
    },
    windows,
    monitors: monitors.map((monitor) => {
      const recent = state.latency[monitor.id]?.recent ?? []
      const lastSample = recent[recent.length - 1]
      const down = isMonitorDown(state, monitor.id)
      const latencyStats = getMonitorLatencyStats(
        state,
        monitor.id,
        currentWindowSeconds('24h'),
        true
      )

      return {
        id: monitor.id,
        name: monitor.name,
        status: state.latency[monitor.id] ? (down ? 'down' : 'up') : 'unknown',
        detailUrl: `/services/${encodeURIComponent(monitor.id)}`,
        serviceUrl: monitor.statusPageLink ?? null,
        lastCheck: lastSample ? isoFromUnix(lastSample.time) : null,
        currentLatencyMs: lastSample?.ping ?? null,
        uptime: Object.fromEntries(
          windows.map((window) => [
            window,
            getMonitorUptimePercent(state, monitor.id, currentWindowSeconds(window)),
          ])
        ),
        latency24h: latencyStats,
      }
    }),
    incidents: incidents.slice(0, 20),
    subscriptions: pageConfig.subscriptions ?? [],
  }
}

export function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
