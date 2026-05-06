import { Alert, List, Text, useMantineTheme } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconAlertTriangle } from '@tabler/icons-react'
import { MaintenanceConfig, MonitorTarget } from '@/types/config'
import { pageConfig } from '@/uptime.config'
import classes from '@/styles/MaintenanceAlert.module.css'

export default function MaintenanceAlert({
  maintenance,
  style,
  upcoming = false,
}: {
  maintenance: Omit<MaintenanceConfig, 'monitors'> & { monitors?: MonitorTarget[] }
  style?: React.CSSProperties
  upcoming?: boolean
}) {
  const theme = useMantineTheme()
  const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`)

  return (
    <Alert
      icon={<IconAlertTriangle />}
      title={
        <span className={classes.title}>
          {(upcoming ? '[Upcoming] ' : '') + (maintenance.title || 'Scheduled Maintenance')}
        </span>
      }
      color={
        upcoming ? pageConfig.maintenances?.upcomingColor ?? 'gray' : maintenance.color || 'yellow'
      }
      withCloseButton={false}
      className={classes.alert}
      style={style}
    >
      <div
        className={`${classes.dateBlock} ${isDesktop ? classes.dateBlockDesktop : ''}`}
      >
        <div className={classes.dateGrid}>
          <div className={classes.dateLabel}>
            {upcoming ? 'Scheduled for:' : 'From:'}
          </div>
          <div>{new Date(maintenance.start).toLocaleString()}</div>
          <div className={classes.dateLabel}>
            {upcoming ? 'Expected end:' : 'To:'}
          </div>
          <div>
            {maintenance.end ? new Date(maintenance.end).toLocaleString() : 'Until further notice'}
          </div>
        </div>
      </div>

      <Text className={classes.body}>{maintenance.body}</Text>
      {maintenance.monitors && maintenance.monitors.length > 0 && (
        <>
          <Text mt="xs">
            <b>Affected components:</b>
          </Text>
          <List size="sm" withPadding>
            {maintenance.monitors.map((comp, compIdx) => (
              <List.Item key={compIdx}>{comp.name}</List.Item>
            ))}
          </List>
        </>
      )}
    </Alert>
  )
}
