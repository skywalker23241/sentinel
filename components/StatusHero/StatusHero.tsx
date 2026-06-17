import { useEffect, useState } from 'react'
import { Box, Collapse } from '@mantine/core'
import type { MaintenanceConfig, MonitorState, MonitorTarget } from '@/types/config'
import StatusIcon, { type StatusIconTone } from '@/components/StatusIcon'
import KpiCard, { type KpiTone } from './KpiCard'
import MaintenanceAlert from '@/components/MaintenanceAlert'
import { getDashboardKpis } from '@/util/uptime'
import { timeRangeToSeconds, type TimeRange } from '@/hooks/useViewPreferences'
import classes from '@/styles/StatusHero.module.css'

const overallLabelByTone: Record<StatusIconTone, string> = {
  up: 'Up',
  down: 'Down',
  degraded: 'Degraded',
  maintenance: 'Maintenance',
  unknown: 'Unknown',
}

function formatUptime(percent: number | null): string {
  if (percent === null || !Number.isFinite(percent)) return '—'
  if (percent >= 99.99) return percent.toFixed(3) + '%'
  return percent.toFixed(2) + '%'
}

function formatLatency(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—'
  return `${Math.round(ms)} ms`
}

function formatRelative(secAgo: number): string {
  if (secAgo < 60) return `${secAgo}s ago`
  if (secAgo < 3600) return `${Math.floor(secAgo / 60)}m ago`
  if (secAgo < 86400) return `${Math.floor(secAgo / 3600)}h ago`
  return `${Math.floor(secAgo / 86400)}d ago`
}

function useTickingClock(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function StatusHero({
  state,
  monitors,
  maintenances,
  timeRange = '90d',
  toolbarSlot,
  refreshSlot,
}: {
  state: MonitorState
  monitors: MonitorTarget[]
  maintenances: MaintenanceConfig[]
  /** Window used for the Avg-uptime KPI; keeps number and label in sync. */
  timeRange?: TimeRange
  /** Optional content slot rendered on the bottom-right (e.g. RefreshButton) */
  refreshSlot?: React.ReactNode
  toolbarSlot?: React.ReactNode
}) {
  const now = useTickingClock()

  const kpis = getDashboardKpis(state, monitors, timeRangeToSeconds(timeRange))
  const downCount = kpis.total - kpis.operational
  const overallTone: StatusIconTone =
    monitors.length === 0
      ? 'unknown'
      : downCount === 0
      ? 'up'
      : downCount === monitors.length
      ? 'down'
      : 'degraded'

  let statusString = 'No data yet'
  if (monitors.length > 0) {
    if (downCount === 0) statusString = 'All systems operational'
    else if (downCount === monitors.length) statusString = 'Major outage · all systems down'
    else statusString = `Partial outage · ${downCount} of ${monitors.length} down`
  }

  const overallLabel = overallLabelByTone[overallTone]

  // Maintenance partitioning (mirrors OverallStatus.tsx logic).
  const nowDate = new Date(now * 1000)
  const expandMonitors = (m: MaintenanceConfig) => ({
    ...m,
    monitors: m.monitors?.map((id) => monitors.find((mm) => mm.id === id)).filter(Boolean) as
      | MonitorTarget[]
      | undefined,
  })
  const activeMaintenances = maintenances
    .filter((m) => nowDate >= new Date(m.start) && (!m.end || nowDate <= new Date(m.end)))
    .map(expandMonitors)
  const upcomingMaintenances = maintenances
    .filter((m) => nowDate < new Date(m.start))
    .map(expandMonitors)

  const [expandUpcoming, setExpandUpcoming] = useState(false)

  const lastUpdateAgo = Math.max(0, now - state.lastUpdate)

  const operationalTone =
    kpis.total === 0 ? 'neutral' : kpis.operational === kpis.total ? 'up' : downCount === kpis.total ? 'down' : 'degraded'

  return (
    <section className={classes.hero} aria-label="Service status overview">
      <div className={classes.heroBanner}>
        <StatusIcon tone={overallTone} size="lg" marginRight={0} />
        <div className={classes.statusTextRow}>
          <h1 className={classes.statusHeading}>{statusString}</h1>
          <div className={classes.lastUpdated}>
            Last updated {new Date(state.lastUpdate * 1000).toLocaleString()}
            {' · '}
            {formatRelative(lastUpdateAgo)}
          </div>
          {upcomingMaintenances.length > 0 && (
            <div className={classes.lastUpdated}>
              {upcomingMaintenances.length} upcoming maintenance
              {upcomingMaintenances.length === 1 ? '' : 's'}{' '}
              <span
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => setExpandUpcoming((v) => !v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setExpandUpcoming((v) => !v)}
              >
                {expandUpcoming ? 'hide' : 'show'}
              </span>
            </div>
          )}
        </div>
        <span className={classes.statusBadge} data-tone={overallTone}>
          {overallLabel}
        </span>
      </div>

      <div className={classes.kpiGrid}>
        <KpiCard
          label="Operational"
          value={`${kpis.operational}/${kpis.total}`}
          hint={
            kpis.total === 0
              ? 'No monitors configured'
              : downCount === 0
              ? 'all clear right now'
              : `${downCount} down right now`
          }
          tone={operationalTone as KpiTone}
        />
        <KpiCard
          label="Avg uptime"
          value={formatUptime(kpis.avgUptimePercent)}
          hint={`last ${timeRange} · all monitors`}
        />
        <KpiCard
          label="Avg latency"
          value={formatLatency(kpis.avgLatencyMs)}
          hint="recent 12h window"
        />
        <KpiCard
          label={kpis.lastIncidentOngoing ? 'Ongoing incident' : 'Last incident'}
          value={
            kpis.lastIncidentAt
              ? formatRelative(Math.max(0, now - Math.floor(kpis.lastIncidentAt)))
              : '—'
          }
          hint={
            kpis.lastIncidentAt
              ? kpis.lastIncidentOngoing
                ? 'down right now'
                : 'time since last incident'
              : 'no incidents recorded'
          }
          tone={kpis.lastIncidentOngoing ? 'down' : 'neutral'}
        />
      </div>

      <Collapse in={expandUpcoming}>
        {upcomingMaintenances.map((m, idx) => (
          <MaintenanceAlert key={`upcoming-${idx}`} maintenance={m} upcoming />
        ))}
      </Collapse>

      {activeMaintenances.length > 0 && (
        <Box>
          {activeMaintenances.map((m, idx) => (
            <MaintenanceAlert key={`active-${idx}`} maintenance={m} />
          ))}
        </Box>
      )}

      {(toolbarSlot || refreshSlot) && (
        <div className={classes.actions}>
          <div style={{ flex: 1, minWidth: 0 }}>{toolbarSlot}</div>
          <div>{refreshSlot}</div>
        </div>
      )}
    </section>
  )
}
