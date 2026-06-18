export type TimeRange = '24h' | '7d' | '30d' | '90d'

export const TIME_RANGES: TimeRange[] = ['24h', '7d', '30d', '90d']

export function parseTimeRange(value: string | null | undefined): TimeRange {
  return TIME_RANGES.includes(value as TimeRange) ? (value as TimeRange) : '24h'
}

export function timeRangeToSeconds(range: TimeRange): number {
  switch (range) {
    case '24h':
      return 24 * 60 * 60
    case '7d':
      return 7 * 24 * 60 * 60
    case '30d':
      return 30 * 24 * 60 * 60
    case '90d':
    default:
      return 90 * 24 * 60 * 60
  }
}

export function timeRangeToDays(range: TimeRange): number {
  switch (range) {
    case '24h':
      return 1
    case '7d':
      return 7
    case '30d':
      return 30
    case '90d':
    default:
      return 90
  }
}
