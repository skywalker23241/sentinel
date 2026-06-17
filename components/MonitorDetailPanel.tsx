import { Anchor, ScrollArea, Text } from '@mantine/core'
import { IconArrowLeft, IconExternalLink } from '@tabler/icons-react'
import type { MonitorState, MonitorTarget, IncidentSeverity } from '@/types/config'
import StatusIcon, { type StatusIconTone } from '@/components/StatusIcon'
import DetailBar from '@/components/DetailBar'
import DetailChart from '@/components/DetailChart'
import LatencyStats from '@/components/LatencyStats'
import { getMonitorAvgLatency, getMonitorUptimePercent, isMonitorDown } from '@/util/uptime'
import { maintenances as configuredMaintenances } from '@/uptime.config'
import type { TimeRange } from '@/hooks/useViewPreferences'
import { timeRangeToSeconds } from '@/hooks/useViewPreferences'
import classes from '@/styles/MonitorDetailPanel.module.css'

const toneLabel: Record<StatusIconTone, string> = {
  up: 'Up',
  down: 'Down',
  degraded: 'Degraded',
  maintenance: 'Maintenance',
  unknown: 'Unknown',
}

const severityLabel: Record<IncidentSeverity, string> = {
  outage: 'Outage',
  degraded: 'Degraded',
  maintenance: 'Maintenance',
  false_positive: 'False positive',
}

function resolveTone(state: MonitorState, monitor: MonitorTarget): StatusIconTone {
  const now = new Date()
  const inMaintenance = configuredMaintenances.some(
    (m) =>
      now >= new Date(m.start) &&
      (!m.end || now <= new Date(m.end)) &&
      m.monitors?.includes(monitor.id)
  )
  if (inMaintenance) return 'maintenance'
  if (!state.latency[monitor.id]) return 'unknown'
  if (isMonitorDown(state, monitor.id)) return 'down'
  return 'up'
}

function formatUptime(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '--'
  if (value >= 99.99) return `${value.toFixed(3)}%`
  return `${value.toFixed(2)}%`
}

function formatLatency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '--'
  return `${Math.round(value)} ms`
}

function getCurrentLatency(state: MonitorState, monitorId: string): number | null {
  const recent = state.latency[monitorId]?.recent
  if (!recent || recent.length === 0) return null
  return recent[recent.length - 1].ping
}

function formatIncidentTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

export default function MonitorDetailPanel({
  monitor,
  state,
  timeRange,
  onBack,
}: {
  monitor: MonitorTarget | null
  state: MonitorState
  timeRange: TimeRange
  onBack?: () => void
}) {
  if (!monitor) {
    return (
      <section className={classes.panel}>
        <div className={classes.emptyState}>
          <Text fw={700}>No monitor selected.</Text>
          <Text size="sm" c="dimmed">
            Add monitors in uptime.config.ts to populate this dashboard.
          </Text>
        </div>
      </section>
    )
  }

  const tone = resolveTone(state, monitor)
  const hasData = !!state.latency[monitor.id]
  const uptime = hasData
    ? getMonitorUptimePercent(state, monitor.id, timeRangeToSeconds(timeRange))
    : null
  const avgLatency = hasData ? getMonitorAvgLatency(state, monitor.id) : null
  const currentLatency = hasData ? getCurrentLatency(state, monitor.id) : null
  // Drop the worker's seeded 'dummy' placeholder so it never counts or shows.
  const incidents = (state.incident[monitor.id] || [])
    .filter((i) => i.error?.[0] !== 'dummy')
    .slice()
    .reverse()
    .slice(0, 10)

  return (
    <section className={classes.panel} aria-label={`${monitor.name} details`}>
      {onBack && (
        <button type="button" className={classes.backButton} onClick={onBack}>
          <IconArrowLeft size={14} />
          Back to overview
        </button>
      )}

      <header className={classes.panelHeader}>
        <div className={classes.titleGroup}>
          <StatusIcon tone={tone} size="lg" marginRight={0} />
          <div className={classes.titleText}>
            <h2>{monitor.name}</h2>
            <p>{monitor.tooltip || monitor.id}</p>
          </div>
        </div>

        <span className={classes.statusBadge} data-tone={tone}>
          {toneLabel[tone]}
        </span>
      </header>

      <div className={classes.actionRow}>
        <span className={classes.methodBadge}>{monitor.method ?? 'GET'}</span>
        {monitor.statusPageLink && (
          <Anchor
            href={monitor.statusPageLink}
            target="_blank"
            rel="noreferrer"
            className={classes.externalLink}
          >
            Open status page <IconExternalLink size={15} />
          </Anchor>
        )}
      </div>

      {hasData ? (
        <>
          <div className={classes.metricGrid}>
            <div className={classes.metricItem}>
              <span>Response</span>
              <strong>{formatLatency(currentLatency)}</strong>
              <small>current</small>
            </div>
            <div className={classes.metricItem}>
              <span>Avg. response</span>
              <strong>{formatLatency(avgLatency)}</strong>
              <small>recent 12h</small>
            </div>
            <div className={classes.metricItem}>
              <span>Uptime</span>
              <strong>{formatUptime(uptime)}</strong>
              <small>{timeRange.toUpperCase()}</small>
            </div>
            <div className={classes.metricItem}>
              <span>Incidents</span>
              <strong>{incidents.length}</strong>
              <small>recent records</small>
            </div>
          </div>

          <div className={classes.sectionBlock}>
            <div className={classes.sectionHeader}>
              <h3>Uptime</h3>
              <span>{timeRange.toUpperCase()}</span>
            </div>
            <DetailBar monitor={monitor} state={state} timeRange={timeRange} />
          </div>

          {!monitor.hideLatencyChart && (
            <div className={classes.sectionBlock}>
              <div className={classes.sectionHeader}>
                <h3>Response time</h3>
                <span>{timeRange.toUpperCase()}</span>
              </div>
              <LatencyStats monitor={monitor} state={state} timeRange={timeRange} />
              <DetailChart monitor={monitor} state={state} timeRange={timeRange} />
            </div>
          )}
        </>
      ) : (
        <div className={classes.emptyState}>
          <Text fw={700}>Waiting for data</Text>
          <Text size="sm" c="dimmed">
            The worker has not written latency data for this monitor yet.
          </Text>
        </div>
      )}

      <div className={classes.sectionBlock}>
        <div className={classes.sectionHeader}>
          <h3>Recent incidents</h3>
          <span>{incidents.length === 0 ? 'clear' : `${incidents.length} shown`}</span>
        </div>

        {incidents.length === 0 ? (
          <div className={classes.incidentEmpty}>No incidents recorded.</div>
        ) : (
          <ScrollArea.Autosize mah={240}>
            <div className={classes.incidentList}>
              {incidents.map((incident, index) => {
                const start = formatIncidentTime(incident.start[0])
                const end = incident.end ? formatIncidentTime(incident.end) : 'ongoing'
                const reason = incident.error[incident.error.length - 1] ?? '--'
                const severity: IncidentSeverity = incident.severity ?? 'outage'
                return (
                  <div
                    className={classes.incidentItem}
                    data-severity={severity}
                    key={`${incident.start[0]}-${index}`}
                  >
                    <div>
                      <strong>
                        {start}
                        {' -> '}
                        {end}
                        <span className={classes.severityTag} data-severity={severity}>
                          {severityLabel[severity]}
                        </span>
                      </strong>
                      <span>{reason}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea.Autosize>
        )}
      </div>
    </section>
  )
}
