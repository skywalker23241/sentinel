/**
 * Status color helpers.
 *
 * Returns CSS variable references defined in styles/globals.css. The variables
 * use `light-dark()` so values automatically adapt to the active Mantine color
 * scheme (`MantineProvider defaultColorScheme="auto"` in pages/_app.tsx).
 *
 * Two helpers are exposed:
 *  - `getStatusTone(percent)` returns a semantic tone keyword. Use this when a
 *    component needs to set a CSS class or pick a Mantine palette key.
 *  - `getColor(percent, darker)` keeps the legacy signature: it returns a CSS
 *    color string suitable for `style={{ color/background }}` consumption.
 *      darker = true  → text-grade contrast (deeper shade)
 *      darker = false → bar/fill-grade contrast (vivid or pale variant)
 */

export type StatusTone = 'up' | 'up-soft' | 'degraded' | 'down' | 'unknown'

export function getStatusTone(percent: number | string): StatusTone {
  const p = Number(percent)
  if (Number.isNaN(p)) return 'unknown'
  if (p >= 99.9) return 'up'
  if (p >= 99) return 'up-soft'
  if (p >= 95) return 'degraded'
  return 'down'
}

/**
 * Legacy color resolver kept for backwards compatibility with existing
 * callers (DetailBar, MonitorDetail, MonitorList). Returns a CSS variable
 * reference that resolves at paint time.
 */
function getColor(percent: number | string, darker: boolean): string {
  const tone = getStatusTone(percent)
  switch (tone) {
    case 'up':
      return darker ? 'var(--status-up)' : 'var(--status-up-vivid)'
    case 'up-soft':
      // 99.0 – 99.9 % range: still green but visually softer to nudge attention
      return darker ? 'var(--status-up-vivid)' : 'var(--status-up-pale)'
    case 'degraded':
      return darker ? 'var(--status-degraded)' : 'var(--status-degraded-vivid)'
    case 'down':
      return darker ? 'var(--status-down)' : 'var(--status-down-vivid)'
    case 'unknown':
    default:
      return 'var(--status-unknown)'
  }
}

/**
 * Convenience: resolve the count-based aggregate color used by group headers
 * (was hard-coded `#059669/#df484a/#f29030` in MonitorList.tsx).
 */
export function getGroupTone(downCount: number, total: number): StatusTone {
  if (total === 0) return 'unknown'
  if (downCount === 0) return 'up'
  if (downCount === total) return 'down'
  return 'degraded'
}

export function getGroupColor(downCount: number, total: number): string {
  const tone = getGroupTone(downCount, total)
  switch (tone) {
    case 'up':
      return 'var(--status-up)'
    case 'down':
      return 'var(--status-down)'
    case 'degraded':
      return 'var(--status-degraded)'
    case 'unknown':
    default:
      return 'var(--status-unknown)'
  }
}

export { getColor }
