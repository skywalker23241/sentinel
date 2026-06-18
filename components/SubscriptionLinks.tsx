import { Anchor } from '@mantine/core'
import {
  IconBellRinging,
  IconBrandTelegram,
  IconBraces,
  IconMail,
  IconRss,
  IconWebhook,
} from '@tabler/icons-react'
import { pageConfig } from '@/uptime.config'
import classes from '@/styles/SubscriptionLinks.module.css'

const iconByType = {
  rss: IconRss,
  telegram: IconBrandTelegram,
  email: IconMail,
  webhook: IconWebhook,
  json: IconBraces,
}

export default function SubscriptionLinks() {
  const subscriptions = pageConfig.subscriptions ?? []
  if (subscriptions.length === 0) return null

  return (
    <section className={classes.panel} aria-label="Subscription and data feeds">
      <div className={classes.heading}>
        <IconBellRinging size={15} />
        <span>Subscribe / Data Feeds</span>
      </div>
      <div className={classes.links}>
        {subscriptions.map((item) => {
          const Icon = iconByType[item.type]
          return (
            <Anchor
              key={`${item.type}-${item.url}`}
              href={item.url}
              target={item.url.startsWith('/') ? undefined : '_blank'}
              rel={item.url.startsWith('/') ? undefined : 'noreferrer'}
              className={classes.link}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </Anchor>
          )
        })}
      </div>
    </section>
  )
}
