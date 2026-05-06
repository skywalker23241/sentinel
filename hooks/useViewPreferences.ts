import { useEffect, useState } from 'react'

export type ViewMode = 'compact' | 'standard' | 'detailed'
export type TimeRange = '24h' | '7d' | '30d' | '90d'

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
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPrefs
    const parsed = JSON.parse(raw) as Partial<ViewPreferences>
    return { ...defaultPrefs, ...parsed }
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
    } catch {
      /* quota / disabled storage – ignore */
    }
  }, [prefs])

  const setPrefs = (patch: Partial<ViewPreferences>) =>
    setState((prev) => ({ ...prev, ...patch }))

  return [prefs, setPrefs]
}

/**
 * Convert a TimeRange enum to seconds. Used by DetailChart to slice data.
 */
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
