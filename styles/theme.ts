import { MantineThemeOverride } from '@mantine/core'

/**
 * Semantic status tokens.
 *
 * Components resolve actual CSS colors via the `--status-*` variables in
 * styles/globals.css. The palette keys remain for Mantine API callers
 * (Alert color, Badge color, etc.).
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
 * SIGNAL OPS Mantine theme.
 *
 * - `colors.dark` is remapped to the ink-blue ramp so every built-in dark
 *   surface (inputs, dropdowns, modals, accordion hover) sits on the same
 *   palette as the custom CSS.
 * - Display font carries UI chrome; mono carries data (set per-component
 *   in CSS Modules via --font-stack-mono).
 */
export const theme: MantineThemeOverride = {
  primaryColor: 'teal',
  fontFamily:
    "var(--font-display), 'PingFang SC', 'Microsoft YaHei', sans-serif",
  fontFamilyMonospace: "var(--font-mono), ui-monospace, 'Cascadia Mono', monospace",
  defaultRadius: 'sm',
  colors: {
    // 0 (lightest) -> 9 (darkest): ink-blue ramp matching --surface-* tokens
    dark: [
      '#dce8ee',
      '#aebfca',
      '#7d93a2',
      '#54707f',
      '#2c4252',
      '#1b2e3c',
      '#13212d',
      '#0c1822',
      '#081019',
      '#04070b',
    ],
  },
  headings: {
    fontWeight: '600',
    fontFamily: "var(--font-display), 'PingFang SC', 'Microsoft YaHei', sans-serif",
    sizes: {
      h1: { fontSize: 'clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem)', lineHeight: '1.2' },
      h2: { fontSize: 'clamp(1.25rem, 1rem + 1.1vw, 1.75rem)', lineHeight: '1.25' },
      h3: { fontSize: 'clamp(1.125rem, 0.95rem + 0.8vw, 1.5rem)', lineHeight: '1.3' },
      h4: { fontSize: 'clamp(1rem, 0.9rem + 0.4vw, 1.25rem)', lineHeight: '1.35' },
      h5: { fontSize: 'clamp(0.9rem, 0.85rem + 0.25vw, 1.05rem)', lineHeight: '1.4' },
      h6: { fontSize: '0.875rem', lineHeight: '1.45' },
    },
  },
  components: {
    Tooltip: {
      defaultProps: {
        styles: {
          tooltip: {
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: '0.72rem',
            background: '#0d1822',
            color: '#9db4c0',
            border: '1px solid #234050',
            borderRadius: 3,
          },
        },
      },
    },
  },
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
      pill: 'var(--radius-pill)',
    },
    shadow: {
      card: 'var(--shadow-card)',
      cardHover: 'var(--shadow-card-hover)',
    },
  },
}
