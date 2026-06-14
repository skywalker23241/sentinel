import { Group, Text } from '@mantine/core'
import { IconActivityHeartbeat } from '@tabler/icons-react'
import classes from '@/styles/Header.module.css'
import { pageConfig } from '@/uptime.config'
import { PageConfigLink } from '@/types/config'

export default function Header({ style }: { style?: React.CSSProperties }) {
  const linkToElement = (link: PageConfigLink, i: number) => {
    return (
      <a
        key={i}
        href={link.link}
        target={link.link.startsWith('/') ? undefined : '_blank'}
        className={classes.link}
        data-active={link.highlight}
      >
        {link.label}
      </a>
    )
  }

  const links = [{ label: 'Incident History', link: '/incidents' }, ...(pageConfig.links || [])]
  const isHome = typeof location !== 'undefined' && location.pathname === '/'
  const brandHref = isHome ? 'https://github.com/lyc8503/UptimeFlare' : '/'

  return (
    <header className={classes.header} style={style}>
      <div className={classes.inner}>
        <div>
          <a
            href={brandHref}
            target={isHome ? '_blank' : undefined}
            rel={isHome ? 'noreferrer' : undefined}
            className={classes.brand}
          >
            <span className={classes.brandMark}>
              <IconActivityHeartbeat size={20} stroke={2.3} />
            </span>
            <Text size="lg" span fw={800} className={classes.brandText}>
              {pageConfig.title || 'UptimeFlare'}
            </Text>
          </a>
        </div>

        <Group gap={5} visibleFrom="sm">
          {links?.map(linkToElement)}
        </Group>

        <Group gap={5} hiddenFrom="sm">
          {links?.filter((link) => link.highlight || link.link.startsWith('/')).map(linkToElement)}
        </Group>
      </div>
    </header>
  )
}
