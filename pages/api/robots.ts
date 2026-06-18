import { NextRequest } from 'next/server'
import { getBaseUrl } from '@/util/requestUrl'

export const runtime = 'edge'

export default function handler(req: NextRequest): Response {
  const baseUrl = getBaseUrl(req)
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
