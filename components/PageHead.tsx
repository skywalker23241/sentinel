import Head from 'next/head'
import { pageConfig } from '@/uptime.config'

export default function PageHead({
  title,
  description = pageConfig.description,
  path = '/',
}: {
  title?: string
  description?: string
  path?: string
}) {
  const pageTitle = title ?? pageConfig.title ?? 'Status Page'
  const canonical =
    pageConfig.siteUrl && `${pageConfig.siteUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`

  return (
    <Head>
      <title>{pageTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta name="theme-color" content="#2ee59d" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta name="twitter:card" content="summary" />
      {canonical && <link rel="canonical" href={canonical} />}
      <link rel="alternate" type="application/rss+xml" title={`${pageConfig.title ?? 'Status Page'} RSS`} href="/rss.xml" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="icon" href={pageConfig.favicon ?? '/favicon.ico'} />
    </Head>
  )
}
