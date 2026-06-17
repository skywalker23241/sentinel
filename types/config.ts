import type { Env } from '../worker/src'

export type PageConfig = {
  title?: string
  links?: PageConfigLink[]
  group?: PageConfigGroup
  favicon?: string
  maintenances?: {
    upcomingColor?: string
  }
}

export type MaintenanceConfig = {
  monitors?: string[]
  title?: string
  body: string
  start: number | string
  end?: number | string
  color?: string
}

export type PageConfigGroup = { [key: string]: string[] }

export type IncidentSeverity = 'outage' | 'degraded' | 'maintenance' | 'false_positive'

export type PageConfigLink = {
  link: string
  label: string
  highlight?: boolean
}

export type MonitorTarget = {
  id: string
  name: string
  method: string
  target: string
  tooltip?: string
  statusPageLink?: string
  hideLatencyChart?: boolean
  expectedCodes?: number[]
  timeout?: number
  checkRetries?: number // 判定为 down 前的重试次数，默认 1，设为 0 关闭重试
  headers?: { [key: string]: string | number }
  body?: string
  responseKeyword?: string
  responseForbiddenKeyword?: string
  checkProxy?: string
  checkProxyFallback?: boolean
}

export type WorkerConfig<TEnv = Env> = {
  kvWriteCooldownMinutes: number
  passwordProtection?: string
  monitors: MonitorTarget[]
  notification?: Notification
  callbacks?: Callbacks<TEnv>
}

export type Notification = {
  webhook?: WebhookConfig
  timeZone?: string
  gracePeriod?: number
  skipNotificationIds?: string[]
}

export type WebhookConfig = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  headers?: { [key: string]: string | number }
  payloadType: 'param' | 'json' | 'x-www-form-urlencoded'
  payload: any
  timeout?: number
}

export type Callbacks<TEnv = Env> = {
  onStatusChange?: (
    env: TEnv,
    monitor: MonitorTarget,
    isUp: boolean,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ) => Promise<any> | any
  onIncident?: (
    env: TEnv,
    monitor: MonitorTarget,
    timeIncidentStart: number,
    timeNow: number,
    reason: string
  ) => Promise<any> | any
}

export type MonitorState = {
  lastUpdate: number
  overallUp: number
  overallDown: number
  incident: Record<
    string,
    {
      start: number[]
      end: number | undefined // undefined if it's still open
      error: string[]
      // Optional classification. Defaults to 'outage' when absent.
      // 'maintenance' and 'false_positive' are excluded from SLA/uptime math.
      severity?: IncidentSeverity
      title?: string
    }[]
  >

  latency: Record<
    string,
    {
      recent: {
        loc: string
        ping: number
        time: number
        up?: boolean
      }[] // recent 12 hour data, 2 min interval
      all: {
        loc: string
        ping: number
        time: number
        up?: boolean
      }[] // all data in 90 days, 1 hour interval
    }
  >
}
