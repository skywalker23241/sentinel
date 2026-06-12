import { Modal, Stack, Text, Group, Badge, Divider, Anchor, ScrollArea } from '@mantine/core'
import type { MonitorState, MonitorTarget } from '@/types/config'
import StatusIcon, { type StatusIconTone } from '@/components/StatusIcon'
import DetailBar from '@/components/DetailBar'
import DetailChart from '@/components/DetailChart'
import { getMonitorAvgLatency, getMonitorUptimePercent, isMonitorDown } from '@/util/uptime'
import { maintenances as configuredMaintenances } from '@/uptime.config'
import type { TimeRange } from '@/hooks/useViewPreferences'

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

/**
 * Detail modal opened when a MonitorCard is clicked. Shows:
 *  - Status header
 *  - Full 90-day DetailBar (independent of the card's `viewMode`)
 *  - Full DetailChart
 *  - Recent incident list (last 10)
 *  - Status page link (if configured)
 */
export default function MonitorDetailModal({
  monitor,
  state,
  timeRange,
  opened,
  onClose,
}: {
  monitor: MonitorTarget | null
  state: MonitorState
  timeRange: TimeRange
  opened: boolean
  onClose: () => void
}) {
  if (!monitor) {
    return (
      <Modal opened={opened} onClose={onClose} title="" size="lg">
        <Text>No monitor selected.</Text>
      </Modal>
    )
  }

  const tone = resolveTone(state, monitor)
  const hasData = !!state.latency[monitor.id]
  const uptime = hasData ? getMonitorUptimePercent(state, monitor.id) : null
  const latency = hasData ? getMonitorAvgLatency(state, monitor.id) : null

  const incidents = (state.incident[monitor.id] || []).slice().reverse().slice(0, 10)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Group gap="xs">
          <StatusIcon tone={tone} size="md" marginRight={0} />
          <Text fw={700}>{monitor.name}</Text>
        </Group>
      }
    >
      <Stack gap="md">
        <Group gap="xs" wrap="wrap">
          {uptime !== null && (
            <Badge variant="light" size="lg">
              Uptime: {uptime.toFixed(2)}%
            </Badge>
          )}
          {latency !== null && (
            <Badge variant="light" size="lg" color="gray">
              Avg latency: {Math.round(latency)} ms
            </Badge>
          )}
          <Badge variant="light" size="lg" color="gray">
            {monitor.method ?? 'GET'}
          </Badge>
          {monitor.statusPageLink && (
            <Anchor href={monitor.statusPageLink} target="_blank" size="sm">
              Open status page ↗
            </Anchor>
          )}
        </Group>

        {hasData ? (
          <>
            <DetailBar monitor={monitor} state={state} timeRange={timeRange} />
            {!monitor.hideLatencyChart && (
              <DetailChart monitor={monitor} state={state} timeRange={timeRange} />
            )}
          </>
        ) : (
          <Text c="dimmed">No data yet — waiting for the worker to populate KV state.</Text>
        )}

        <Divider label="Recent incidents" labelPosition="left" />
        {incidents.length === 0 ? (
          <Text c="dimmed" size="sm">
            No incidents recorded.
          </Text>
        ) : (
          <ScrollArea.Autosize mah={240}>
            <Stack gap="xs">
              {incidents.map((incident, idx) => {
                const start = new Date(incident.start[0] * 1000).toLocaleString()
                const end = incident.end
                  ? new Date(incident.end * 1000).toLocaleString()
                  : 'ongoing'
                const reason = incident.error[incident.error.length - 1] ?? '—'
                return (
                  <Stack key={idx} gap={2}>
                    <Text size="sm" fw={500}>
                      {start} → {end}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {reason}
                    </Text>
                  </Stack>
                )
              })}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Stack>
    </Modal>
  )
}
