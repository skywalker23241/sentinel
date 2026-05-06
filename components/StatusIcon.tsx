import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconHelpCircle,
} from '@tabler/icons-react'
import type { CSSProperties, ReactNode } from 'react'

export type StatusIconTone = 'up' | 'down' | 'degraded' | 'maintenance' | 'unknown'

const sizeMap = {
  sm: '1em',
  md: '1.25em',
  lg: '1.75em',
  xl: 'clamp(48px, 6vw, 96px)',
} as const

type SizeKey = keyof typeof sizeMap

const toneToColor: Record<StatusIconTone, string> = {
  up: 'var(--status-up)',
  down: 'var(--status-down)',
  degraded: 'var(--status-degraded)',
  maintenance: 'var(--status-maintenance)',
  unknown: 'var(--status-unknown)',
}

const toneToIcon: Record<StatusIconTone, (props: { style: CSSProperties }) => ReactNode> = {
  up: ({ style }) => <IconCircleCheck style={style} />,
  down: ({ style }) => <IconAlertCircle style={style} />,
  degraded: ({ style }) => <IconAlertTriangle style={style} />,
  maintenance: ({ style }) => <IconAlertTriangle style={style} />,
  unknown: ({ style }) => <IconHelpCircle style={style} />,
}

/**
 * Single source of truth for status iconography.
 *
 * Replaces the inline `<IconCircleCheck style={{ width: '1.25em', height: '1.25em', color: '#059669' }} />`
 * style scattered across MonitorDetail.tsx, OverallStatus.tsx, MonitorList.tsx.
 */
export default function StatusIcon({
  tone,
  size = 'md',
  marginRight = '3px',
  style,
}: {
  tone: StatusIconTone
  size?: SizeKey
  marginRight?: number | string
  style?: CSSProperties
}) {
  const dim = sizeMap[size]
  const Icon = toneToIcon[tone]
  return (
    <Icon
      style={{
        width: dim,
        height: dim,
        color: toneToColor[tone],
        marginRight,
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
