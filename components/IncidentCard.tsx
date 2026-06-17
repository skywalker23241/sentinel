import { Alert, Badge, Group, Text } from '@mantine/core'
import { IconActivity, IconCircleCheck } from '@tabler/icons-react'
import type { IncidentSeverity } from '@/types/config'
import classes from '@/styles/MaintenanceAlert.module.css'

/**
 * A real, monitoring-detected incident derived from `state.incident`.
 * (Distinct from MaintenanceConfig, which describes *planned* windows.)
 */
export type DerivedIncident = {
  monitorId: string
  monitorName: string
  start: number // unix seconds
  end?: number // unix seconds; undefined while ongoing
  reason: string
  ongoing: boolean
  severity: IncidentSeverity
}

/** Label + Mantine color for each severity. Drives the badge and (while
 *  ongoing) the alert frame color. */
export const severityMeta: Record<IncidentSeverity, { label: string; color: string }> = {
  outage: { label: 'Outage', color: 'red' },
  degraded: { label: 'Degraded', color: 'yellow' },
  maintenance: { label: 'Maintenance', color: 'blue' },
  false_positive: { label: 'False positive', color: 'gray' },
}

function formatDuration(startSec: number, endSec: number): string {
  const total = Math.max(0, Math.round(endSec - startSec))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${total}s`
}

export default function IncidentCard({ incident }: { incident: DerivedIncident }) {
  const now = Date.now() / 1000
  const end = incident.end ?? now
  const sev = severityMeta[incident.severity] ?? severityMeta.outage
  // Ongoing incidents glow in their severity color; resolved ones go quiet.
  const frameColor = incident.ongoing ? sev.color : 'gray'

  return (
    <Alert
      icon={incident.ongoing ? <IconActivity /> : <IconCircleCheck />}
      color={frameColor}
      withCloseButton={false}
      className={classes.alert}
      title={
        <Group gap="xs" wrap="wrap">
          <span className={classes.title}>{incident.monitorName}</span>
          <Badge size="sm" color={sev.color} variant="light">
            {sev.label}
          </Badge>
          <Badge size="sm" color={incident.ongoing ? 'red' : 'gray'} variant="light">
            {incident.ongoing ? 'Ongoing' : 'Resolved'}
          </Badge>
        </Group>
      }
    >
      <div className={classes.dateBlock}>
        <div className={classes.dateGrid}>
          <div className={classes.dateLabel}>From:</div>
          <div>{new Date(incident.start * 1000).toLocaleString()}</div>
          <div className={classes.dateLabel}>{incident.ongoing ? 'Status:' : 'To:'}</div>
          <div>
            {incident.ongoing
              ? 'Still down'
              : new Date(incident.end! * 1000).toLocaleString()}
          </div>
          <div className={classes.dateLabel}>Duration:</div>
          <div>{formatDuration(incident.start, end)}</div>
        </div>
      </div>

      <Text className={classes.body} mt="xs">
        {incident.reason || 'unspecified'}
      </Text>
    </Alert>
  )
}
