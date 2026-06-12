import { Text } from '@mantine/core'
import classes from '@/styles/Footer.module.css'

export default function Footer() {
  return (
    <footer className={classes.footer}>
      <Text size="xs" className={classes.text}>
        Open-source monitoring and status page powered by{' '}
        <a href="https://github.com/lyc8503/UptimeFlare" target="_blank" rel="noreferrer">
          Uptimeflare
        </a>{' '}
        and{' '}
        <a href="https://www.cloudflare.com/" target="_blank" rel="noreferrer">
          Cloudflare
        </a>
        , made with ❤ by{' '}
        <a href="https://github.com/lyc8503" target="_blank" rel="noreferrer">
          lyc8503
        </a>
        .
      </Text>
    </footer>
  )
}
