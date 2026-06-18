import { MonitorState, MonitorTarget } from '@/types/config'
import { getColor } from '@/util/color'
import { Box, Tooltip, Modal } from '@mantine/core'
import { useResizeObserver } from '@mantine/hooks'
import { useState, useMemo } from 'react'
import type { TimeRange } from '@/hooks/useViewPreferences'
import { timeRangeToDays } from '@/hooks/useViewPreferences'
import { getMonitorIncidentAt, pickBarDayCount } from '@/util/uptime'
import classes from '@/styles/DetailBar.module.css'

const moment = require('moment')
require('moment-precise-range-plugin')

export default function DetailBar({
  monitor,
  state,
  timeRange = '90d',
  variant = 'default',
}: {
  monitor: MonitorTarget
  state: MonitorState
  timeRange?: TimeRange
  variant?: 'default' | 'mini'
}) {
  const [barRef, barRect] = useResizeObserver()
  const [modalOpened, setModalOpened] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modelContent, setModelContent] = useState(<div />)

  const overlapLen = (x1: number, x2: number, y1: number, y2: number) => {
    return Math.max(0, Math.min(x2, y2) - Math.max(x1, y1))
  }

  const totalDays = timeRangeToDays(timeRange)
  const recentLatency = state.latency[monitor.id]?.recent ?? []

  // Decide how many days to actually render: bounded by both the user's
  // chosen range AND the available container width. This replaces the
  // old `visibleFrom="540"` blanket-hide on small screens.
  const dayCount = useMemo(() => {
    if (barRect.width === 0) return totalDays
    return Math.min(totalDays, pickBarDayCount(barRect.width, totalDays))
  }, [barRect.width, totalDays])

  const recentSampleCount = useMemo(() => {
    if (recentLatency.length === 0) return 0
    if (barRect.width === 0) return recentLatency.length
    return pickBarDayCount(barRect.width, recentLatency.length)
  }, [barRect.width, recentLatency.length])

  const uptimePercentBars = []

  const currentTime = Math.round(Date.now() / 1000)
  const monitorIncidents = state.incident[monitor.id] ?? []
  const monitorStartTime = monitorIncidents[0]?.start?.[0] ?? currentTime - totalDays * 86400

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const cutoff = currentTime - totalDays * 86400
  const recentSamples =
    timeRange === '24h'
      ? [...recentLatency]
          .filter((sample) => sample.time >= cutoff)
          .sort((a, b) => a.time - b.time)
          .slice(-recentSampleCount)
      : []

  if (recentSamples.length > 0) {
    for (let index = 0; index < recentSamples.length; index++) {
      const sample = recentSamples[index]
      const incident = getMonitorIncidentAt(state, monitor.id, sample.time)
      const isUp = sample.up ?? !incident
      const statusLabel = isUp ? 'UP' : 'DOWN'
      const barColor = isUp ? getColor(100, false) : getColor(0, false)

      uptimePercentBars.push(
        <Tooltip
          multiline
          key={`${sample.time}-${index}`}
          events={{ hover: true, focus: false, touch: true }}
          label={
            <>
              <div>
                {statusLabel} at {new Date(sample.time * 1000).toLocaleString()}
              </div>
              <div>
                {sample.ping} ms from {sample.loc}
              </div>
              {!isUp && incident && <div>{incident.error[incident.error.length - 1]}</div>}
            </>
          }
        >
          <div
            className={classes.day}
            data-clickable={!isUp && !!incident}
            style={{ background: barColor }}
            onClick={(e) => {
              if (!isUp && incident) {
                e.stopPropagation()
                setModalTitle(
                  `🚨 ${monitor.name} incident at ${new Date(
                    incident.start[0] * 1000
                  ).toLocaleString()}`
                )
                setModelContent(
                  <>
                    {incident.error.map((reason, reasonIndex) => (
                      <div key={reasonIndex}>{reason}</div>
                    ))}
                  </>
                )
                setModalOpened(true)
              }
            }}
          />
        </Tooltip>
      )
    }
  } else {
    // Render the most recent `dayCount` days. i = (dayCount - 1) means the
    // oldest of the chosen window; i = 0 is today.
    for (let i = dayCount - 1; i >= 0; i--) {
      const dayStart = Math.round(todayStart.getTime() / 1000) - i * 86400
      const dayEnd = dayStart + 86400

      const dayMonitorTime = overlapLen(dayStart, dayEnd, monitorStartTime, currentTime)
      let dayDownTime = 0

      let incidentReasons: string[] = []

      for (let incident of monitorIncidents) {
        const incidentStart = incident.start[0]
        const incidentEnd = incident.end ?? currentTime

        const overlap = overlapLen(dayStart, dayEnd, incidentStart, incidentEnd)
        dayDownTime += overlap

        if (overlap > 0) {
          for (let j = 0; j < incident.error.length; j++) {
            let partStart = incident.start[j]
            let partEnd =
              j === incident.error.length - 1 ? incident.end ?? currentTime : incident.start[j + 1]
            partStart = Math.max(partStart, dayStart)
            partEnd = Math.min(partEnd, dayEnd)

            if (overlapLen(dayStart, dayEnd, partStart, partEnd) > 0) {
              const startStr = new Date(partStart * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
              const endStr = new Date(partEnd * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
              incidentReasons.push(`[${startStr}-${endStr}] ${incident.error[j]}`)
            }
          }
        }
      }

      const dayPercent = (((dayMonitorTime - dayDownTime) / dayMonitorTime) * 100).toPrecision(4)

      uptimePercentBars.push(
        <Tooltip
          multiline
          key={i}
          events={{ hover: true, focus: false, touch: true }}
          label={
            Number.isNaN(Number(dayPercent)) ? (
              'No Data'
            ) : (
              <>
                <div>{dayPercent + '% at ' + new Date(dayStart * 1000).toLocaleDateString()}</div>
                {dayDownTime > 0 && (
                  <div>{`Down for ${moment.preciseDiff(
                    moment(0),
                    moment(dayDownTime * 1000)
                  )} (click for detail)`}</div>
                )}
              </>
            )
          }
        >
          <div
            className={classes.day}
            data-clickable={dayDownTime > 0}
            style={{ background: getColor(dayPercent, false) }}
            onClick={(e) => {
              if (dayDownTime > 0) {
                e.stopPropagation()
                setModalTitle(
                  `🚨 ${monitor.name} incidents at ${new Date(
                    dayStart * 1000
                  ).toLocaleDateString()}`
                )
                setModelContent(
                  <>
                    {incidentReasons.map((reason, index) => (
                      <div key={index}>{reason}</div>
                    ))}
                  </>
                )
                setModalOpened(true)
              }
            }}
          />
        </Tooltip>
      )
    }
  }

  return (
    <>
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={modalTitle}
        size="40em"
      >
        {modelContent}
      </Modal>
      <Box className={classes.bar} data-variant={variant} ref={barRef}>
        {uptimePercentBars}
      </Box>
    </>
  )
}
