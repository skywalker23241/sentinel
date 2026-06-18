import { pageConfig } from '@/uptime.config'

export const runtime = 'edge'

export default function handler(): Response {
  return Response.json(
    {
      name: pageConfig.title ?? 'Status Page',
      short_name: pageConfig.title ?? 'Status',
      description: pageConfig.description ?? 'Personal service status page',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#04070b',
      theme_color: '#2ee59d',
      icons: [
        {
          src: pageConfig.favicon ?? '/favicon.ico',
          sizes: '48x48',
          type: 'image/x-icon',
        },
      ],
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    }
  )
}
