import { useCallback, useEffect, useRef, useState } from 'react'
import type { MonitorState, MonitorTarget } from '@/types/config'

type LiveStateResult = {
  state: MonitorState
  monitors: MonitorTarget[]
  lastFetched: number
  isRefreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

const DEFAULT_INTERVAL_MS = 60 * 1000
const STALE_HARD_RELOAD_AFTER_MS = 10 * 60 * 1000

/**
 * Polls /api/state at a fixed cadence and exposes the latest snapshot
 * without ever forcing a full-page reload (replaces the `window.location.reload()`
 * fallback in OverallStatus.tsx).
 *
 * Behavior:
 *  - Pauses while document.visibilityState !== 'visible'
 *  - Manual refresh via the returned `refresh()`
 *  - If 3 consecutive fetches fail AND data is older than 10 min, triggers a hard
 *    reload as last-resort (matches the legacy semantics)
 */
export function useLiveState(
  initial: { state: MonitorState; monitors: MonitorTarget[] },
  options: { intervalMs?: number; enabled?: boolean } = {}
): LiveStateResult {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
  const enabled = options.enabled !== false

  const [snapshot, setSnapshot] = useState(initial)
  const [lastFetched, setLastFetched] = useState(() => Date.now())
  const [isRefreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const failureCountRef = useRef(0)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/state', { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { state: string | MonitorState; monitors: MonitorTarget[] }
      const parsedState =
        typeof json.state === 'string' ? (JSON.parse(json.state) as MonitorState) : json.state
      setSnapshot({ state: parsedState, monitors: json.monitors })
      setLastFetched(Date.now())
      failureCountRef.current = 0
    } catch (e) {
      failureCountRef.current += 1
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      // Last-resort hard reload only if state is genuinely stale; protects users
      // from a server that's been redeployed.
      if (
        failureCountRef.current >= 3 &&
        Date.now() - lastFetched > STALE_HARD_RELOAD_AFTER_MS
      ) {
        if (typeof window !== 'undefined') window.location.reload()
      }
    } finally {
      setRefreshing(false)
    }
  }, [lastFetched])

  // Periodic poll, paused when tab is hidden.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    let timer: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (timer) return
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') refresh()
      }, intervalMs)
    }
    const stop = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Catch-up fetch on tab regain
        refresh()
        start()
      } else {
        stop()
      }
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs, refresh])

  return {
    state: snapshot.state,
    monitors: snapshot.monitors,
    lastFetched,
    isRefreshing,
    error,
    refresh,
  }
}
