# ABO Status Page Operations

This document records the public interfaces and operational guardrails for
`Abo的监控站`.

## Public Endpoints

These endpoints are intentionally public and must never include secrets,
internal API URLs, private server IPs, or webhook tokens.

| Endpoint | Purpose | Cache |
| --- | --- | --- |
| `/healthz` | External uptime probe for the status page itself. | `no-store` |
| `/status.json` | Machine-readable current summary, monitor uptime windows, and latest incidents. | 30s |
| `/incidents.json?limit=50` | Machine-readable incident feed. `limit` is clamped to 1-100. | 60s |
| `/rss.xml` | RSS incident feed for subscribers. | 60s |
| `/robots.txt` | Search crawler policy and sitemap discovery. | 1h |
| `/sitemap.xml` | Home, incidents, feeds, and per-service pages. | 1h |
| `/site.webmanifest` | Installable app metadata and theme color. | 1d |

## External Monitoring

Monitor the status page from outside the same Cloudflare account or provider.
Use `/healthz` as the primary target because it checks that the app can start,
read KV state, and report fresh metadata without requiring page hydration.

Suggested alerting:

- Warning when `/healthz` is non-200 for 2 consecutive checks.
- Critical when `/healthz` is non-200 for 5 minutes.
- Warning when `updatedAt` is older than 10 minutes.
- Critical when `updatedAt` is older than 30 minutes.

## Subscriptions

Public subscription links live in `pageConfig.subscriptions` inside
`uptime.config.ts`.

Safe examples:

```ts
subscriptions: [
  { type: 'rss', label: 'RSS', url: '/rss.xml' },
  { type: 'json', label: 'Status JSON', url: '/status.json' },
  { type: 'telegram', label: 'Telegram', url: 'https://t.me/example_channel' },
]
```

Do not put private Telegram bot tokens, webhook secrets, Email API tokens, or
admin-only URLs in `pageConfig.subscriptions`. Notification secrets belong in
Cloudflare secrets such as `TG_BOT_TOKEN` and `TG_CHAT_ID`.

## Security Guardrails

- Keep internal APIs, real origin IPs, and private webhook URLs out of public
  JSON responses.
- Protect any future admin UI with at least one of: Cloudflare Access, 2FA,
  IP allowlists, or strong HTTP Basic auth.
- Keep the response headers in `next.config.js` enabled: HSTS, CSP,
  `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Development allows CSP `unsafe-eval` only so Next React Refresh can run.
  Production does not include it.

## SEO And Discovery

Set `pageConfig.siteUrl` to the production origin when the final domain is
known. Without it, XML/RSS endpoints infer the host from each request, which is
fine for preview environments but less stable for canonical URLs.
