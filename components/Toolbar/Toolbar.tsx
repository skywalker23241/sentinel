import { ActionIcon, SegmentedControl, Select, TextInput, Tooltip } from '@mantine/core'
import { IconRefresh, IconSearch, IconX } from '@tabler/icons-react'
import type { TimeRange, ViewMode } from '@/hooks/useViewPreferences'
import classes from '@/styles/Toolbar.module.css'

export default function Toolbar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  isRefreshing,
  lastFetchedAgo,
}: {
  search: string
  onSearchChange: (q: string) => void
  viewMode: ViewMode
  onViewModeChange: (m: ViewMode) => void
  timeRange: TimeRange
  onTimeRangeChange: (r: TimeRange) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  lastFetchedAgo?: string
}) {
  return (
    <div className={classes.toolbar} role="toolbar" aria-label="Dashboard controls">
      <TextInput
        className={classes.search}
        placeholder="Search monitors..."
        value={search}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        rightSection={
          search ? (
            <ActionIcon
              variant="subtle"
              size="sm"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
            >
              <IconX size={14} />
            </ActionIcon>
          ) : null
        }
        size="sm"
      />

      <div className={classes.controls}>
        <Select
          aria-label="Time range"
          size="sm"
          allowDeselect={false}
          value={timeRange}
          onChange={(v) => v && onTimeRangeChange(v as TimeRange)}
          data={[
            { value: '24h', label: 'Last 24h' },
            { value: '7d', label: 'Last 7d' },
            { value: '30d', label: 'Last 30d' },
            { value: '90d', label: 'Last 90d' },
          ]}
          style={{ width: 130 }}
        />

        <SegmentedControl
          size="sm"
          value={viewMode}
          onChange={(v) => onViewModeChange(v as ViewMode)}
          data={[
            { value: 'compact', label: 'Compact' },
            { value: 'standard', label: 'Standard' },
            { value: 'detailed', label: 'Detailed' },
          ]}
        />

        {onRefresh && (
          <span className={classes.refreshGroup}>
            <Tooltip label={isRefreshing ? 'Refreshing...' : 'Refresh now'}>
              <ActionIcon
                variant="subtle"
                aria-label="Refresh"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <IconRefresh
                  size={16}
                  className={isRefreshing ? classes.spin : undefined}
                />
              </ActionIcon>
            </Tooltip>
            {lastFetchedAgo && <span>{lastFetchedAgo}</span>}
          </span>
        )}
      </div>
    </div>
  )
}
