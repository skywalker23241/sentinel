import { useMemo } from 'react'
import type { MonitorState, MonitorTarget } from '@/types/config'
import { getMonitorLatencyStats } from '@/util/uptime'
import { timeRangeToSeconds, type TimeRange } from '@/hooks/useViewPreferences'
import classes from '@/styles/LatencyStats.module.css'

/**
 * Compact Avg / P95 / P99 / Max strip for response-time latency, computed over
 * the currently-selected time range. Series selection mirrors DetailChart so
 * the numbers always match the chart rendered right below it.
 *
 * Renders nothing when the monitor has no samples in the window.
 */
export default function LatencyStats({
  monitor,
  state,
  timeRange = '90d',
}: {
  monitor: MonitorTarget
  state: MonitorState
  timeRange?: TimeRange
}) {
  const stats = useMemo(() => {
    // 24h uses the high-resolution `recent` series, same rule as DetailChart.
    const useRecent = timeRange === '24h'
    return getMonitorLatencyStats(state, monitor.id, timeRangeToSeconds(timeRange), useRecent)
  }, [state, monitor.id, timeRange])

  if (!stats) return null

  const items: { label: string; value: number }[] = [
    { label: 'Avg', value: stats.avg },
    { label: 'P95', value: stats.p95 },
    { label: 'P99', value: stats.p99 },
    { label: 'Max', value: stats.max },
  ]

  return (
    <div
      className={classes.strip}
      role="group"
      aria-label="Response time statistics"
      title={`${stats.count} samples in the last ${timeRange}`}
    >
      {items.map((it) => (
        <div className={classes.stat} key={it.label}>
          <span className={classes.label}>{it.label}</span>
          <strong className={classes.value}>
            {Math.round(it.value)}
            <small>ms</small>
          </strong>
        </div>
      ))}
    </div>
  )
}
