import { useMemo } from 'react'
import { Accordion, Box, Text } from '@mantine/core'
import type { MonitorState, MonitorTarget } from '@/types/config'
import { pageConfig } from '@/uptime.config'
import MonitorCard from './MonitorCard'
import EmptyState from './EmptyState'
import { getGroupColor, getGroupTone } from '@/util/color'
import { isMonitorDown } from '@/util/uptime'
import type { ViewMode, TimeRange } from '@/hooks/useViewPreferences'
import classes from '@/styles/MonitorGrid.module.css'

function countDown(state: MonitorState, ids: string[]): number {
  return ids.reduce((acc, id) => (isMonitorDown(state, id) ? acc + 1 : acc), 0)
}

function filterBySearch(monitors: MonitorTarget[], query: string): MonitorTarget[] {
  const q = query.trim().toLowerCase()
  if (!q) return monitors
  return monitors.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.tooltip ?? '').toLowerCase().includes(q)
  )
}

export default function MonitorGrid({
  layout = 'cards',
  monitors,
  state,
  search,
  viewMode,
  timeRange,
  selectedId,
  expandedGroups,
  onExpandedGroupsChange,
  onSelect,
}: {
  layout?: 'cards' | 'sidebar'
  monitors: MonitorTarget[]
  state: MonitorState
  search: string
  viewMode: ViewMode
  timeRange: TimeRange
  selectedId?: string
  expandedGroups: string[]
  onExpandedGroupsChange: (groups: string[]) => void
  onSelect?: (monitor: MonitorTarget) => void
}) {
  const group = pageConfig.group
  const isGrouped = !!group && Object.keys(group).length > 0

  const visibleMonitors = useMemo(
    () => filterBySearch(monitors, search),
    [monitors, search]
  )
  const visibleIds = useMemo(() => new Set(visibleMonitors.map((m) => m.id)), [visibleMonitors])

  // No-results state (search filters out everything)
  if (visibleMonitors.length === 0) {
    return (
      <Box className={classes.wrapper} data-layout={layout}>
        <EmptyState
          message={
            search
              ? `No monitors match "${search}".`
              : 'No monitors configured. Edit uptime.config.ts to add some.'
          }
        />
      </Box>
    )
  }

  if (isGrouped && group) {
    // Per-group accordion. Each panel renders its OWN responsive grid so wide
    // screens still get multi-column layout inside a single group.
    const visibleGroupNames = Object.keys(group).filter((name) =>
      group[name].some((id) => visibleIds.has(id))
    )

    return (
      <Box className={classes.wrapper} data-layout={layout}>
        <Accordion
          multiple
          value={expandedGroups}
          onChange={onExpandedGroupsChange}
          variant="separated"
          classNames={{
            root: classes.accordionRoot,
            item: classes.accordionItem,
          }}
        >
          {visibleGroupNames.map((groupName) => {
            const ids = group[groupName]
            const downCount = countDown(state, ids)
            const tone = getGroupTone(downCount, ids.length)
            const groupMonitors = visibleMonitors
              .filter((m) => ids.includes(m.id))
              .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))

            return (
              <Accordion.Item key={groupName} value={groupName}>
                <Accordion.Control>
                  <div className={classes.groupHeader}>
                    <Text fw={600}>{groupName}</Text>
                    <Text
                      className={classes.groupCount}
                      style={{ color: getGroupColor(downCount, ids.length) }}
                      data-tone={tone}
                    >
                      {ids.length - downCount}/{ids.length} Operational
                    </Text>
                  </div>
                </Accordion.Control>
                <Accordion.Panel>
                  <div className={classes.accordionPanelContent}>
                    <div className={classes.grid}>
                      {groupMonitors.map((monitor) => (
                        <MonitorCard
                          key={monitor.id}
                          monitor={monitor}
                          state={state}
                          viewMode={viewMode}
                          timeRange={timeRange}
                          layout={layout === 'sidebar' ? 'sidebar' : 'card'}
                          selected={selectedId === monitor.id}
                          onSelect={onSelect}
                        />
                      ))}
                    </div>
                  </div>
                </Accordion.Panel>
              </Accordion.Item>
            )
          })}
        </Accordion>
      </Box>
    )
  }

  // Ungrouped layout: a single responsive grid.
  return (
    <Box className={classes.wrapper} data-layout={layout}>
      <div className={classes.grid}>
        {visibleMonitors.map((monitor) => (
          <MonitorCard
            key={monitor.id}
            monitor={monitor}
            state={state}
            viewMode={viewMode}
            timeRange={timeRange}
            layout={layout === 'sidebar' ? 'sidebar' : 'card'}
            selected={selectedId === monitor.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </Box>
  )
}
