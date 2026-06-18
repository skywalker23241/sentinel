import { NextRequest } from 'next/server'
import { workerConfig } from '@/uptime.config'
import { escapeXml } from '@/util/publicStatus'
import { getBaseUrl } from '@/util/requestUrl'

export const runtime = 'edge'

export default function handler(req: NextRequest): Response {
  const baseUrl = getBaseUrl(req)
  const now = new Date().toISOString()
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'always' },
    { loc: '/incidents', priority: '0.8', changefreq: 'hourly' },
    { loc: '/status.json', priority: '0.5', changefreq: 'always' },
    { loc: '/incidents.json', priority: '0.5', changefreq: 'hourly' },
    { loc: '/rss.xml', priority: '0.5', changefreq: 'hourly' },
    ...workerConfig.monitors.map((monitor) => ({
      loc: `/services/${encodeURIComponent(monitor.id)}`,
      priority: '0.7',
      changefreq: 'always',
    })),
  ]

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (url) =>
        `<url><loc>${escapeXml(`${baseUrl}${url.loc}`)}</loc><lastmod>${now}</lastmod><changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`
    ),
    '</urlset>',
  ].join('')

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
