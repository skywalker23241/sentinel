import { useEffect, useState } from 'react'
import {
  TIME_RANGES,
  timeRangeToDays,
  timeRangeToSeconds,
  type TimeRange,
} from '@/util/timeRange'

export type ViewMode = 'compact' | 'standard' | 'detailed'
export { TIME_RANGES, timeRangeToDays, timeRangeToSeconds, type TimeRange }

export type ViewPreferences = {
  viewMode: ViewMode
  timeRange: TimeRange
  search: string
  expandedGroups: string[]
  autoRefresh: boolean
}

const STORAGE_KEY = 'uptimeflare:view-prefs:v1'

const defaultPrefs: ViewPreferences = {
  viewMode: 'standard',
  timeRange: '90d',
  search: '',
  expandedGroups: [],
  autoRefresh: true,
}

function readPrefs(): ViewPreferences {
  if (typeof window === 'undefined') return defaultPrefs
  try {
    const params = new URLSearchParams(window.location.search)
    const urlRange = params.get('range')
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return TIME_RANGES.includes(urlRange as TimeRange)
        ? { ...defaultPrefs, timeRange: urlRange as TimeRange }
        : defaultPrefs
    }
    const parsed = JSON.parse(raw) as Partial<ViewPreferences>
    const merged = { ...defaultPrefs, ...parsed }
    return TIME_RANGES.includes(urlRange as TimeRange)
      ? { ...merged, timeRange: urlRange as TimeRange }
      : merged
  } catch {
    return defaultPrefs
  }
}

/**
 * Centralised user-preference store backed by localStorage. Replaces the
 * scattered `expandedGroups` state in MonitorList.tsx and adds search,
 * viewMode, timeRange, autoRefresh.
 *
 * Usage:
 *   const [prefs, setPrefs] = useViewPreferences()
 *   setPrefs({ viewMode: 'compact' })   // shallow merge
 */
export function useViewPreferences(): [
  ViewPreferences,
  (patch: Partial<ViewPreferences>) => void,
] {
  const [prefs, setState] = useState<ViewPreferences>(defaultPrefs)

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setState(readPrefs())
  }, [])

  // Persist on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      const url = new URL(window.location.href)
      url.searchParams.set('range', prefs.timeRange)
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    } catch {
      /* quota / disabled storage – ignore */
    }
  }, [prefs])

  const setPrefs = (patch: Partial<ViewPreferences>) =>
    setState((prev) => ({ ...prev, ...patch }))

  return [prefs, setPrefs]
}

