import type { MonitorState, MonitorTarget } from '@/types/config'

/**
 * Compute the uptime percent for a single monitor.
 *
 * - `windowSec` bounds the measurement window (e.g. 24h / 7d / 30d). When
 *   omitted it falls back to the full incident history.
 * - A monitor that HAS probe data but no qualifying downtime reports 100% —
 *   it is no longer dropped to `null`, which previously biased the dashboard
 *   average toward only the monitors that had failed.
 * - `maintenance` / `false_positive` incidents do not count as downtime.
 *
 * Returns `null` only when the monitor has no probe data at all (truly unknown).
 */
export function getMonitorUptimePercent(
  state: MonitorState,
  monitorId: string,
  windowSec?: number
): number | null {
  if (!state.latency[monitorId]) return null

  const incidents = state.incident[monitorId] ?? []
  const now = Date.now() / 1000
  const from = windowSec ? now - windowSec : incidents[0]?.start[0] ?? now
  const totalTime = now - from
  if (totalTime <= 0) return 100

  let downTime = 0
  for (const incident of incidents) {
    if (incident.severity === 'maintenance' || incident.severity === 'false_positive') continue
    // Clip the incident to the measurement window before accumulating.
    const start = Math.max(incident.start[0], from)
    const end = Math.min(incident.end ?? now, now)
    if (end > start) downTime += end - start
  }

  return Math.max(0, ((totalTime - downTime) / totalTime) * 100)
}

/**
 * Mean latency for a single monitor.
 *
 * - Without `windowSec`, averages the full `recent` probe series.
 * - With `windowSec`, delegates to {@link getMonitorLatencyStats} (respecting
 *   `useRecent` for series selection) so the value matches the latency strip and
 *   chart shown for the same time range.
 *
 * Returns `null` when there are no samples in scope.
 */
export function getMonitorAvgLatency(
  state: MonitorState,
  monitorId: string,
  windowSec?: number,
  useRecent = false
): number | null {
  if (!windowSec) {
    const recent = state.latency[monitorId]?.recent
    if (!recent || recent.length === 0) return null
    const total = recent.reduce((acc, p) => acc + p.ping, 0)
    return total / recent.length
  }

  return getMonitorLatencyStats(state, monitorId, windowSec, useRecent)?.avg ?? null
}

export type LatencyStats = {
  avg: number
  p50: number
  p95: number
  p99: number
  max: number
  min: number
  count: number
}

type LatencySample = MonitorState['latency'][string]['recent'][number]

/**
 * Pick the latency series that backs a given range, mirroring DetailChart:
 * the 24h range (`useRecent`) reads the high-resolution `recent` series; longer
 * ranges read the hourly `all` series, falling back to `recent` when `all` has
 * too few points. Returns `[]` when the monitor has no latency data.
 */
export function pickLatencySeries(
  latency: MonitorState['latency'][string] | undefined,
  useRecent: boolean
): LatencySample[] {
  if (!latency) return []
  const preferred = useRecent ? latency.recent : latency.all
  return preferred && preferred.length >= 2 ? preferred : latency.recent ?? []
}

/**
 * Latency distribution (avg / p50 / p95 / p99 / max / min) over a time window.
 *
 * Series selection mirrors DetailChart so the numbers always match the chart a
 * user is looking at:
 *   - `useRecent` (the 24h range) reads the high-resolution `recent` series;
 *   - longer ranges read the hourly `all` series, falling back to `recent`
 *     when `all` has too few points.
 *
 * Percentiles use the nearest-rank method on ascending-sorted pings.
 * Returns `null` when there are no samples inside the window.
 */
export function getMonitorLatencyStats(
  state: MonitorState,
  monitorId: string,
  windowSec: number,
  useRecent: boolean
): LatencyStats | null {
  const series = pickLatencySeries(state.latency[monitorId], useRecent)
  if (series.length === 0) return null

  const cutoff = Date.now() / 1000 - windowSec
  const pings = series
    .filter((p) => p.time >= cutoff)
    .map((p) => p.ping)
    .sort((a, b) => a - b)
  if (pings.length === 0) return null

  // nearest-rank: smallest value whose rank ≥ q. Clamped to a valid index.
  const nearestRank = (q: number) =>
    pings[Math.min(pings.length - 1, Math.max(0, Math.ceil(q * pings.length) - 1))]

  const sum = pings.reduce((acc, p) => acc + p, 0)
  return {
    avg: sum / pings.length,
    p50: nearestRank(0.5),
    p95: nearestRank(0.95),
    p99: nearestRank(0.99),
    max: pings[pings.length - 1],
    min: pings[0],
    count: pings.length,
  }
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
  monitorId: string,
  windowSec?: number
): number | null {
  const recent = state.latency[monitorId]?.recent
  if (!recent || recent.length === 0) return null

  const cutoff = windowSec ? Date.now() / 1000 - windowSec : null
  const samples = cutoff ? recent.filter((sample) => sample.time >= cutoff) : recent
  if (samples.length === 0) return null

  let upCount = 0
  for (const sample of samples) {
    const isUp = sample.up ?? !getMonitorIncidentAt(state, monitorId, sample.time)
    if (isUp) upCount++
  }

  return (upCount / samples.length) * 100
}

export function getMonitorWindowIncidents(
  state: MonitorState,
  monitorId: string,
  windowSec: number,
  now = Date.now() / 1000
) {
  const from = now - windowSec
  return (state.incident[monitorId] || [])
    .filter((incident) => {
      if (incident.error?.[0] === 'dummy') return false
      const start = incident.start[0]
      const end = incident.end ?? now
      return end >= from && start <= now
    })
    .slice()
    .reverse()
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
  /** Whether the most recent incident is still open (no end timestamp). */
  lastIncidentOngoing: boolean
}

export function getDashboardKpis(
  state: MonitorState,
  monitors: MonitorTarget[],
  uptimeWindowSec?: number
): DashboardKpis {
  let operational = 0
  let uptimeSum = 0
  let uptimeCount = 0
  let latencySum = 0
  let latencyCount = 0
  let lastIncidentAt: number | null = null
  let lastIncidentOngoing = false

  for (const m of monitors) {
    if (!isMonitorDown(state, m.id)) operational++

    const up = getMonitorUptimePercent(state, m.id, uptimeWindowSec)
    if (up !== null && Number.isFinite(up)) {
      uptimeSum += up
      uptimeCount++
    }

    const lat = getMonitorAvgLatency(state, m.id, uptimeWindowSec, uptimeWindowSec === 86400)
    if (lat !== null && Number.isFinite(lat)) {
      latencySum += lat
      latencyCount++
    }

    const incidents = state.incident[m.id] || []
    for (const incident of incidents) {
      const ongoing = incident.end === undefined
      const end = incident.end ?? incident.start[incident.start.length - 1]
      if (lastIncidentAt === null || end > lastIncidentAt) {
        lastIncidentAt = end
        lastIncidentOngoing = ongoing
      }
    }
  }

  return {
    operational,
    total: monitors.length,
    avgUptimePercent: uptimeCount > 0 ? uptimeSum / uptimeCount : null,
    avgLatencyMs: latencyCount > 0 ? latencySum / latencyCount : null,
    lastIncidentAt,
    lastIncidentOngoing,
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
