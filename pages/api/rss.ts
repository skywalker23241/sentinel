import { NextRequest } from 'next/server'
import { pageConfig, workerConfig } from '@/uptime.config'
import type { MonitorState } from '@/types/config'
import { escapeXml, getPublicIncidents } from '@/util/publicStatus'

export const runtime = 'edge'

function absoluteUrl(req: NextRequest, path: string): string {
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0] ?? 'https'
  const host = req.headers.get('host') ?? 'localhost'
  return `${proto}://${host}${path}`
}

export default async function handler(req: NextRequest): Promise<Response> {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const stateStr = await UPTIMEFLARE_STATE?.get('state')
  if (!stateStr) {
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel /></rss>',
      {
        status: 503,
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
      }
    )
  }

  const state = JSON.parse(stateStr) as MonitorState
  const incidents = getPublicIncidents(state, workerConfig.monitors).slice(0, 30)
  const title = pageConfig.title ?? 'Status Page'
  const siteUrl = absoluteUrl(req, '/')
  const items = incidents
    .map((incident) => {
      const link = absoluteUrl(req, `/services/${encodeURIComponent(incident.monitorId)}`)
      return [
        '<item>',
        `<title>${escapeXml(`[${incident.severity}] ${incident.monitorName}: ${incident.status}`)}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid isPermaLink="false">${escapeXml(incident.id)}</guid>`,
        `<pubDate>${new Date(incident.startedAt).toUTCString()}</pubDate>`,
        `<description>${escapeXml(incident.reason)}</description>`,
        '</item>',
      ].join('')
    })
    .join('')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    `<title>${escapeXml(title)} incidents</title>`,
    `<link>${escapeXml(siteUrl)}</link>`,
    `<description>${escapeXml(`${title} incident feed`)}</description>`,
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    '</channel>',
    '</rss>',
  ].join('')

  return new Response(xml, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
