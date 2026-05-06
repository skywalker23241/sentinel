import { MantineThemeOverride } from '@mantine/core'

/**
 * Semantic status tokens.
 *
 * Each status maps to a Mantine palette key + shade pair so that components
 * can resolve the actual CSS color via `theme.colors[key][shade]` at runtime
 * (or via the `var(--mantine-color-{key}-{shade})` CSS variable inside CSS
 * Modules with `light-dark()` for automatic dark-mode adaptation).
 */
export const statusTokens = {
  up: { key: 'teal', shade: 6, lighter: 4 },
  down: { key: 'red', shade: 6, lighter: 4 },
  degraded: { key: 'orange', shade: 6, lighter: 4 },
  maintenance: { key: 'yellow', shade: 6, lighter: 4 },
  unknown: { key: 'gray', shade: 5, lighter: 3 },
} as const

export type StatusTone = keyof typeof statusTokens

/**
 * Mantine theme override.
 * Keep `primaryColor: 'blue'` to stay aligned with the existing Header gradient.
 */
export const theme: MantineThemeOverride = {
  primaryColor: 'blue',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
  defaultRadius: 'md',
  // Fluid heading sizes – clamp() lets each title scale smoothly from mobile to 4K
  // without per-breakpoint media queries.
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: 'clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem)', lineHeight: '1.2' },
      h2: { fontSize: 'clamp(1.25rem, 1rem + 1.1vw, 1.75rem)', lineHeight: '1.25' },
      h3: { fontSize: 'clamp(1.125rem, 0.95rem + 0.8vw, 1.5rem)', lineHeight: '1.3' },
      h4: { fontSize: 'clamp(1rem, 0.9rem + 0.4vw, 1.25rem)', lineHeight: '1.35' },
      h5: { fontSize: 'clamp(0.9rem, 0.85rem + 0.25vw, 1.05rem)', lineHeight: '1.4' },
      h6: { fontSize: '0.875rem', lineHeight: '1.45' },
    },
  },
  // Surface tokens & semantic status colors live here so they're visible to
  // both `useMantineTheme()` consumers and CSS Modules (via vars below).
  other: {
    statusTokens,
    surface: {
      pageBg: 'var(--surface-page)',
      cardBg: 'var(--surface-card)',
      cardBorder: 'var(--surface-card-border)',
      muted: 'var(--surface-muted)',
    },
    radius: {
      card: 'var(--radius-card)',
      pill: '9999px',
    },
    shadow: {
      card: 'var(--shadow-card)',
      cardHover: 'var(--shadow-card-hover)',
    },
  },
}
