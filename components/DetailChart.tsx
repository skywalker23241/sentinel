import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import 'chartjs-adapter-moment'
import { useMemo } from 'react'
import { MonitorState, MonitorTarget } from '@/types/config'
import { iataToCountry } from '@/util/iata'
import type { TimeRange } from '@/hooks/useViewPreferences'
import { timeRangeToSeconds } from '@/hooks/useViewPreferences'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  TimeScale
)

export default function DetailChart({
  monitor,
  state,
  timeRange = '90d',
}: {
  monitor: MonitorTarget
  state: MonitorState
  timeRange?: TimeRange
}) {
  const data = useMemo(() => {
    // For short ranges (24h) use the high-resolution `recent` series;
    // for longer ranges fall back to the hourly `all` series so charts
    // remain readable across 7d/30d/90d.
    const useRecent = timeRange === '24h'
    const series = useRecent ? state.latency[monitor.id]?.recent : state.latency[monitor.id]?.all
    if (!series) return { datasets: [] }

    const cutoff = Date.now() / 1000 - timeRangeToSeconds(timeRange)
    const filtered = series
      .filter((p) => p.time >= cutoff)
      .map((p) => ({ x: p.time * 1000, y: p.ping, loc: p.loc }))

    return {
      datasets: [
        {
          data: filtered,
          // Use light/dark-aware color via CSS variable resolution at paint time
          // (chart.js accepts any valid CSS color string)
          borderColor: 'var(--mantine-color-gray-6)',
          borderWidth: 2,
          radius: 0,
          cubicInterpolationMode: 'monotone' as const,
          tension: 0.4,
        },
      ],
    }
  }, [state, monitor.id, timeRange])

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      animation: { duration: 0 },
      plugins: {
        tooltip: {
          callbacks: {
            label: (item: any) => {
              if (item.parsed.y) {
                return `${item.parsed.y}ms (${iataToCountry(item.raw.loc)})`
              }
            },
          },
        },
        legend: { display: false },
        title: {
          display: true,
          text: 'Response times (ms)',
          align: 'start' as const,
          color: 'var(--mantine-color-gray-6)',
        },
      },
      scales: {
        x: {
          type: 'time' as const,
          ticks: {
            source: 'auto' as const,
            maxRotation: 0,
            autoSkip: true,
          },
        },
      },
    }),
    []
  )

  return (
    <div style={{ height: 'clamp(120px, 22vw, 220px)', width: '100%' }}>
      <Line options={options} data={data as any} />
    </div>
  )
}
