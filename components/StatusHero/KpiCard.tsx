import classes from '@/styles/StatusHero.module.css'

export type KpiTone = 'up' | 'down' | 'degraded' | 'neutral'

export default function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: KpiTone
}) {
  return (
    <div
      className={classes.kpiCard}
      data-tone={tone === 'neutral' ? undefined : tone}
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <div className={classes.kpiLabel}>{label}</div>
      <div className={classes.kpiValue}>{value}</div>
      {hint && <div className={classes.kpiHint}>{hint}</div>}
    </div>
  )
}
