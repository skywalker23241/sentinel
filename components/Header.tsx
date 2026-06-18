import { Burger, Drawer, Group, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconActivityHeartbeat } from '@tabler/icons-react'
import classes from '@/styles/Header.module.css'
import { pageConfig } from '@/uptime.config'
import { PageConfigLink } from '@/types/config'

export default function Header({ style }: { style?: React.CSSProperties }) {
  const [opened, { open, close }] = useDisclosure(false)

  const linkToElement = (link: PageConfigLink, i: number, variant: 'desktop' | 'drawer') => {
    return (
      <a
        key={i}
        href={link.link}
        target={link.link.startsWith('/') ? undefined : '_blank'}
        rel={link.link.startsWith('/') ? undefined : 'noreferrer'}
        className={variant === 'drawer' ? classes.drawerLink : classes.link}
        data-active={link.highlight}
        onClick={variant === 'drawer' ? close : undefined}
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

        <Group gap={5} visibleFrom="sm" className={classes.desktopNav}>
          {links?.map((link, i) => linkToElement(link, i, 'desktop'))}
        </Group>

        <Burger
          opened={opened}
          onClick={open}
          hiddenFrom="sm"
          size="sm"
          aria-label="Open navigation menu"
          className={classes.menuButton}
        />
      </div>

      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="min(86vw, 320px)"
        title="Navigation"
        padding="md"
        classNames={{
          content: classes.drawerContent,
          header: classes.drawerHeader,
          title: classes.drawerTitle,
          body: classes.drawerBody,
          close: classes.drawerClose,
        }}
      >
        <nav className={classes.drawerNav} aria-label="Mobile navigation">
          {links.map((link, i) => linkToElement(link, i, 'drawer'))}
        </nav>
      </Drawer>
    </header>
  )
}
