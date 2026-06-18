import type { CSSProperties } from 'react'
import type { MonitorState, MonitorTarget } from '@/types/config'
import { Tooltip } from '@mantine/core'
import StatusIcon, { type StatusIconTone } from '@/components/StatusIcon'
import DetailBar from '@/components/DetailBar'
import DetailChart from '@/components/DetailChart'
import {
  getMonitorAvgLatency,
  getMonitorRecentSampleUptimePercent,
  getMonitorUptimePercent,
  isMonitorDown,
} from '@/util/uptime'
import { getStatusTone } from '@/util/color'
import { maintenances as configuredMaintenances } from '@/uptime.config'
import type { ViewMode, TimeRange } from '@/hooks/useViewPreferences'
import { timeRangeToSeconds } from '@/hooks/useViewPreferences'
import classes from '@/styles/MonitorCard.module.css'

const stripClass: Record<StatusIconTone, string> = {
  up: classes.statusStripUp,
  down: classes.statusStripDown,
  degraded: classes.statusStripDegraded,
  maintenance: classes.statusStripMaintenance,
  unknown: classes.statusStripUnknown,
}

function resolveTone(state: MonitorState, monitor: MonitorTarget): StatusIconTone {
  // Maintenance window takes precedence over data-derived status
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

export default function MonitorCard({
  monitor,
  state,
  viewMode,
  timeRange,
  layout = 'card',
  selected = false,
  onSelect,
}: {
  monitor: MonitorTarget
  state: MonitorState
  viewMode: ViewMode
  timeRange: TimeRange
  layout?: 'card' | 'sidebar'
  selected?: boolean
  onSelect?: (monitor: MonitorTarget) => void
}) {
  const tone = resolveTone(state, monitor)
  const hasData = !!state.latency[monitor.id]
  const windowSec = timeRangeToSeconds(timeRange)
  const uptimePercent = hasData
    ? timeRange === '24h'
      ? getMonitorRecentSampleUptimePercent(state, monitor.id, windowSec)
      : getMonitorUptimePercent(state, monitor.id, windowSec)
    : null
  const avgLatency = hasData
    ? getMonitorAvgLatency(state, monitor.id, windowSec, timeRange === '24h')
    : null

  const uptimeStr = uptimePercent !== null ? uptimePercent.toFixed(2) : '—'
  const uptimeColor =
    uptimePercent !== null
      ? `var(--status-${
          getStatusTone(uptimePercent) === 'up-soft' ? 'up' : getStatusTone(uptimePercent)
        })`
      : 'var(--status-unknown)'

  const titleNode = monitor.statusPageLink ? (
    <a
      href={monitor.statusPageLink}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      {monitor.name}
    </a>
  ) : (
    monitor.name
  )

  const titleWrapped = monitor.tooltip ? (
    <Tooltip label={monitor.tooltip} withinPortal>
      <span className={classes.title}>{titleNode}</span>
    </Tooltip>
  ) : (
    <span className={classes.title}>{titleNode}</span>
  )

  const handleClick = () => {
    if (onSelect) onSelect(monitor)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <article
      className={classes.card}
      data-layout={layout}
      data-view={viewMode}
      data-selected={selected ? 'true' : undefined}
      onClick={handleClick}
      onKeyDown={handleKey}
      role="button"
      tabIndex={0}
      aria-label={`${monitor.name} ${uptimeStr}% uptime`}
    >
      <span className={`${classes.statusStrip} ${stripClass[tone]}`} aria-hidden />

      <header className={classes.header}>
        <div className={classes.titleRow}>
          <StatusIcon tone={tone} size="md" />
          {titleWrapped}
        </div>
        <span
          className={classes.uptime}
          style={{ ['--uptime-color' as string]: uptimeColor } as CSSProperties}
        >
          {uptimeStr}%
        </span>
      </header>

      {!hasData ? (
        <div className={classes.metaRow}>
          <span>No data yet — waiting for worker...</span>
        </div>
      ) : viewMode === 'compact' ? (
        <div className={classes.compactBody}>
          <DetailBar monitor={monitor} state={state} timeRange={timeRange} variant="mini" />
          {avgLatency !== null && (
            <span className={classes.compactStat}>{Math.round(avgLatency)} ms avg</span>
          )}
        </div>
      ) : (
        <div className={classes.body}>
          <DetailBar monitor={monitor} state={state} timeRange={timeRange} />
          {viewMode === 'detailed' && !monitor.hideLatencyChart && (
            <DetailChart monitor={monitor} state={state} timeRange={timeRange} />
          )}
          {avgLatency !== null && (
            <div className={classes.metaRow}>
              <span className={classes.metaItem}>Avg latency: {Math.round(avgLatency)} ms</span>
              <a
                href={`/services/${encodeURIComponent(monitor.id)}`}
                className={classes.detailLink}
                onClick={(e) => e.stopPropagation()}
              >
                Detail
              </a>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
