import type { NextApiRequest, NextApiResponse } from 'next'
import type { KVNamespace } from '@cloudflare/workers-types'
import { workerConfig } from '@/uptime.config'

export const runtime = 'experimental-edge'

/**
 * Lightweight JSON state endpoint for client-side polling (useLiveState).
 * Reads the same KV slot as `getServerSideProps` so SSR + client refresh are
 * always coherent. Public-readable; do NOT add secrets to the response.
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  let state: string | null = null
  try {
    state = (await UPTIMEFLARE_STATE?.get('state')) ?? null
  } catch (e) {
    res.status(500).json({ error: 'Failed to read state from KV' })
    return
  }

  const monitors = workerConfig.monitors.map((monitor) => ({
    id: monitor.id,
    name: monitor.name,
    // @ts-ignore – tooltip / statusPageLink / hideLatencyChart live on user-extended types
    tooltip: monitor.tooltip,
    // @ts-ignore
    statusPageLink: monitor.statusPageLink,
    // @ts-ignore
    hideLatencyChart: monitor.hideLatencyChart,
  }))

  // Cache only briefly: the worker writes at most every kvWriteCooldownMinutes.
  res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=30')
  res.status(200).json({ state, monitors })
}
