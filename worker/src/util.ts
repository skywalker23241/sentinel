import { WebhookConfig } from '../../types/config'

async function getWorkerLocation() {
  const res = await fetch('https://cloudflare.com/cdn-cgi/trace')
  const text = await res.text()

  const colo = /^colo=(.*)$/m.exec(text)?.[1]
  return colo
}

const fetchTimeout = (
  url: string,
  ms: number,
  { signal, ...options }: RequestInit<RequestInitCfProperties> | undefined = {}
): Promise<Response> => {
  const controller = new AbortController()
  const promise = fetch(url, { signal: controller.signal, ...options })
  if (signal) signal.addEventListener('abort', () => controller.abort())
  const timeout = setTimeout(() => controller.abort(), ms)
  return promise.finally(() => clearTimeout(timeout))
}

function withTimeout<T>(millis: number, promise: Promise<T>): Promise<T> {
  const timeout = new Promise<T>((resolve, reject) =>
    setTimeout(() => reject(new Error(`Promise timed out after ${millis}ms`)), millis)
  )

  return Promise.race([promise, timeout])
}

function formatStatusChangeNotification(
  monitor: any,
  isUp: boolean,
  timeIncidentStart: number,
  timeNow: number,
  reason: string,
  timeZone: string
) {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone,
  })

  let downtimeDuration = Math.round((timeNow - timeIncidentStart) / 60)
  const timeNowFormatted = dateFormatter.format(new Date(timeNow * 1000))
  const timeIncidentStartFormatted = dateFormatter.format(new Date(timeIncidentStart * 1000))

  if (isUp) {
    return `✅ ${monitor.name} is up! \nThe service is up again after being down for ${downtimeDuration} minutes.`
  } else if (timeNow == timeIncidentStart) {
    return `🔴 ${
      monitor.name
    } is currently down. \nService is unavailable at ${timeNowFormatted}. \nIssue: ${
      reason || 'unspecified'
    }`
  } else {
    return `🔴 ${
      monitor.name
    } is still down. \nService is unavailable since ${timeIncidentStartFormatted} (${downtimeDuration} minutes). \nIssue: ${
      reason || 'unspecified'
    }`
  }
}

function templateWebhookPlayload(payload: any, message: string) {
  for (const key in payload) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      if (payload[key] === '$MSG') {
        payload[key] = message
      } else if (typeof payload[key] === 'object' && payload[key] !== null) {
        templateWebhookPlayload(payload[key], message)
      }
    }
  }
}

/**
 * Replace `${VAR}` placeholders in any string within a value using Cloudflare
 * Worker env (secrets/vars). Lets secrets (e.g. Telegram bot token, chat id)
 * live in env bindings instead of the committed uptime.config.ts.
 */
function interpolateSecrets<T>(value: T, env: Record<string, unknown>): T {
  if (typeof value === 'string') {
    return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name: string) => {
      const v = env[name]
      return v === undefined || v === null ? '' : String(v)
    }) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => interpolateSecrets(v, env)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = interpolateSecrets(v, env)
    }
    return out as unknown as T
  }
  return value
}

async function webhookNotify(
  webhook: WebhookConfig,
  message: string,
  env: Record<string, unknown> = {}
) {
  // Resolve any ${ENV_VAR} placeholders (e.g. bot token, chat id) from env
  // before doing anything else — never log the raw secret-bearing URL.
  const url0 = interpolateSecrets(webhook.url, env)
  console.log('Sending webhook notification: ' + JSON.stringify(message))
  try {
    let url = url0
    let method = webhook.method
    let headers = new Headers(interpolateSecrets(webhook.headers ?? {}, env) as any)
    let payloadTemplated: { [key: string]: string | number } = interpolateSecrets(
      JSON.parse(JSON.stringify(webhook.payload)),
      env
    )
    templateWebhookPlayload(payloadTemplated, message)
    let body = undefined

    switch (webhook.payloadType) {
      case 'param':
        method = method ?? 'GET'
        const urlTmp = new URL(url)
        for (const [k, v] of Object.entries(payloadTemplated)) {
          urlTmp.searchParams.append(k, v.toString())
        }
        url = urlTmp.toString()
        break
      case 'json':
        method = method ?? 'POST'
        if (headers.get('content-type') === null) {
          headers.set('content-type', 'application/json')
        }
        body = JSON.stringify(payloadTemplated)
        break
      case 'x-www-form-urlencoded':
        method = method ?? 'POST'
        if (headers.get('content-type') === null) {
          headers.set('content-type', 'application/x-www-form-urlencoded')
        }
        body = new URLSearchParams(payloadTemplated as any).toString()
        break
      default:
        throw 'Unrecognized payload type: ' + webhook.payloadType
    }

    console.log(
      `Webhook finalized: ${method} ${url0.replace(
        /\$\{[A-Z0-9_]+\}|(bot)[^/]+/g,
        '$1***'
      )} (host ${new URL(url).host})`
    )
    const resp = await fetchTimeout(url, webhook.timeout ?? 5000, { method, headers, body })

    if (!resp.ok) {
      console.log(
        'Error calling webhook server, code: ' + resp.status + ', response: ' + (await resp.text())
      )
    } else {
      console.log('Webhook notification sent successfully, code: ' + resp.status)
    }
  } catch (e) {
    console.log('Error calling webhook server: ' + e)
  }
}

export {
  getWorkerLocation,
  fetchTimeout,
  withTimeout,
  webhookNotify,
  formatStatusChangeNotification,
}
