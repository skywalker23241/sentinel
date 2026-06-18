import { pageConfig } from '@/uptime.config'

type HeaderReader = {
  headers: {
    get?: (name: string) => string | null
    host?: string
    [key: string]: any
  }
}

export function getBaseUrl(req: HeaderReader): string {
  if (pageConfig.siteUrl) return pageConfig.siteUrl.replace(/\/$/, '')

  const getHeader = (name: string) => {
    if (typeof req.headers.get === 'function') return req.headers.get(name)
    return req.headers[name] ?? req.headers[name.toLowerCase()]
  }

  const proto = String(getHeader('x-forwarded-proto') ?? 'https').split(',')[0]
  const host = getHeader('host') ?? 'localhost'
  return `${proto}://${host}`
}
