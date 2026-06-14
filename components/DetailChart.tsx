import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Decimation,
  Tooltip as ChartTooltip,
  TimeScale,
  type ScriptableContext,
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
  Filler,
  Decimation,
  ChartTooltip,
  TimeScale
)

// chart.js paints onto canvas and CANNOT resolve CSS var() strings — every
// color here must be a concrete value. These mirror the SIGNAL OPS tokens
// in styles/globals.css.
const HUD = {
  line: '#2ee59d',
  fillTop: 'rgba(46, 229, 157, 0.14)',
  fillBottom: 'rgba(46, 229, 157, 0)',
  grid: 'rgba(118, 146, 165, 0.09)',
  tick: '#5d7585',
  tooltipBg: '#0d1822',
  tooltipBorder: '#234050',
  tooltipText: '#e6f2ee',
  tooltipMuted: '#9db4c0',
}

const MONO = "'IBM Plex Mono', ui-monospace, monospace"

function verticalGradient(context: ScriptableContext<'line'>) {
  const { ctx, chartArea } = context.chart
  if (!chartArea) return HUD.fillBottom
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, HUD.fillTop)
  gradient.addColorStop(1, HUD.fillBottom)
  return gradient
}

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
    // Short ranges use the high-resolution `recent` series; longer ranges
    // use the hourly `all` series so charts stay readable.
    const useRecent = timeRange === '24h'
    const latency = state.latency[monitor.id]
    const preferredSeries = useRecent ? latency?.recent : latency?.all
    const series =
      preferredSeries && preferredSeries.length >= 2 ? preferredSeries : latency?.recent
    if (!series) return { datasets: [] }

    const cutoff = Date.now() / 1000 - timeRangeToSeconds(timeRange)
    const filtered = series
      .filter((p) => p.time >= cutoff)
      .map((p) => ({ x: p.time * 1000, y: p.ping, loc: p.loc }))

    return {
      datasets: [
        {
          data: filtered,
          borderColor: HUD.line,
          backgroundColor: verticalGradient,
          fill: true,
          borderWidth: 1.3,
          radius: filtered.length <= 1 ? 2 : 0,
          hoverRadius: 3,
          pointBackgroundColor: HUD.line,
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
      // Decimation needs raw {x,y} points without parsing
      parsing: false as const,
      normalized: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      animation: { duration: 0 },
      plugins: {
        decimation: {
          enabled: true,
          algorithm: 'lttb' as const,
          samples: 250,
          threshold: 400,
        },
        tooltip: {
          backgroundColor: HUD.tooltipBg,
          borderColor: HUD.tooltipBorder,
          borderWidth: 1,
          titleColor: HUD.tooltipMuted,
          bodyColor: HUD.tooltipText,
          titleFont: { family: MONO, size: 10 },
          bodyFont: { family: MONO, size: 12 },
          padding: 10,
          cornerRadius: 3,
          displayColors: false,
          callbacks: {
            label: (item: any) => {
              if (item.parsed.y) {
                return `${item.parsed.y}ms (${iataToCountry(item.raw.loc)})`
              }
            },
          },
        },
        legend: { display: false },
      },
      scales: {
        x: {
          type: 'time' as const,
          grid: { color: HUD.grid },
          border: { color: HUD.grid },
          ticks: {
            source: 'auto' as const,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 7,
            color: HUD.tick,
            font: { family: MONO, size: 10 },
          },
        },
        y: {
          grid: { color: HUD.grid },
          border: { color: HUD.grid },
          ticks: {
            maxTicksLimit: 5,
            color: HUD.tick,
            font: { family: MONO, size: 10 },
          },
        },
      },
    }),
    []
  )

  return (
    <div style={{ height: 'clamp(120px, 22vw, 220px)', width: '100%' }}>
      <Line options={options as any} data={data as any} />
    </div>
  )
}
