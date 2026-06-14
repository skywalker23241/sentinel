import type { MonitorState, MonitorTarget } from '@/types/config'

/**
 * Compute the uptime percent for a single monitor across its full incident
 * history. Logic mirrors `MonitorDetail.tsx:57-63` which we now reuse here.
 */
export function getMonitorUptimePercent(state: MonitorState, monitorId: string): number | null {
  const incidents = state.incident[monitorId]
  if (!incidents || incidents.length === 0) return null

  const now = Date.now() / 1000
  const totalTime = now - incidents[0].start[0]
  if (totalTime <= 0) return null

  let downTime = 0
  for (const incident of incidents) {
    downTime += (incident.end ?? now) - incident.start[0]
  }
  return ((totalTime - downTime) / totalTime) * 100
}

/**
 * Mean recent latency (12h window) for a single monitor.
 */
export function getMonitorAvgLatency(state: MonitorState, monitorId: string): number | null {
  const recent = state.latency[monitorId]?.recent
  if (!recent || recent.length === 0) return null
  const total = recent.reduce((acc, p) => acc + p.ping, 0)
  return total / recent.length
}

export function getMonitorIncidentAt(state: MonitorState, monitorId: string, time: number) {
  const incidents = state.incident[monitorId]
  if (!incidents || incidents.length === 0) return undefined

  return incidents.find((incident) => {
    if (incident.error[0] === 'dummy') return false
    const incidentStart = incident.start[0]
    const incidentEnd = incident.end ?? Date.now() / 1000
    return time >= incidentStart && time < incidentEnd
  })
}

/**
 * Availability across the recent probe samples. This is the same data used by
 * the compact status bars, so sidebar/card percentages match what users see.
 */
export function getMonitorRecentSampleUptimePercent(
  state: MonitorState,
  monitorId: string
): number | null {
  const recent = state.latency[monitorId]?.recent
  if (!recent || recent.length === 0) return null

  let upCount = 0
  for (const sample of recent) {
    const isUp = sample.up ?? !getMonitorIncidentAt(state, monitorId, sample.time)
    if (isUp) upCount++
  }

  return (upCount / recent.length) * 100
}

/**
 * Whether the monitor is currently DOWN (latest incident has no end timestamp).
 */
export function isMonitorDown(state: MonitorState, monitorId: string): boolean {
  const incidents = state.incident[monitorId]
  if (!incidents || incidents.length === 0) return false
  const last = incidents[incidents.length - 1]
  return last.end === undefined
}

/**
 * Aggregate KPIs across all monitors for the StatusHero overview cards.
 */
export type DashboardKpis = {
  operational: number
  total: number
  avgUptimePercent: number | null
  avgLatencyMs: number | null
  lastIncidentAt: number | null
}

export function getDashboardKpis(state: MonitorState, monitors: MonitorTarget[]): DashboardKpis {
  let operational = 0
  let uptimeSum = 0
  let uptimeCount = 0
  let latencySum = 0
  let latencyCount = 0
  let lastIncidentAt: number | null = null

  for (const m of monitors) {
    if (!isMonitorDown(state, m.id)) operational++

    const up = getMonitorUptimePercent(state, m.id)
    if (up !== null && Number.isFinite(up)) {
      uptimeSum += up
      uptimeCount++
    }

    const lat = getMonitorAvgLatency(state, m.id)
    if (lat !== null && Number.isFinite(lat)) {
      latencySum += lat
      latencyCount++
    }

    const incidents = state.incident[m.id] || []
    for (const incident of incidents) {
      const end = incident.end ?? incident.start[incident.start.length - 1]
      if (lastIncidentAt === null || end > lastIncidentAt) {
        lastIncidentAt = end
      }
    }
  }

  return {
    operational,
    total: monitors.length,
    avgUptimePercent: uptimeCount > 0 ? uptimeSum / uptimeCount : null,
    avgLatencyMs: latencyCount > 0 ? latencySum / latencyCount : null,
    lastIncidentAt,
  }
}

/**
 * How many days of bar history to render in DetailBar based on container width.
 * Replaces the old `visibleFrom="540"` blanket-hide on small screens.
 */
export function pickBarDayCount(containerWidthPx: number, totalDays = 90): number {
  if (containerWidthPx <= 0) return 0
  // Each bar is 7px wide + 2px gap; reserve 16px slack for borders/padding
  const perBar = 9
  const usable = Math.max(0, containerWidthPx - 16)
  const fits = Math.floor(usable / perBar)
  return Math.max(0, Math.min(totalDays, fits))
}
