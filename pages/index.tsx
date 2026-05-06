import Head from 'next/head'
import { Inter } from 'next/font/google'
import { useState } from 'react'
import { Center, Text } from '@mantine/core'

import type { MonitorState, MonitorTarget } from '@/types/config'
import type { KVNamespace } from '@cloudflare/workers-types'
import { maintenances, pageConfig, workerConfig } from '@/uptime.config'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import StatusHero from '@/components/StatusHero/StatusHero'
import Toolbar from '@/components/Toolbar/Toolbar'
import MonitorGrid from '@/components/MonitorGrid/MonitorGrid'
import MonitorDetailModal from '@/components/MonitorGrid/MonitorDetailModal'

import { useLiveState } from '@/hooks/useLiveState'
import { useViewPreferences } from '@/hooks/useViewPreferences'

export const runtime = 'experimental-edge'
const inter = Inter({ subsets: ['latin'] })

function relativeTime(ms: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  return `${Math.floor(sec / 3600)}h ago`
}

export default function Home({
  state: stateStr,
  monitors,
}: {
  state: string
  monitors: MonitorTarget[]
}) {
  const initialState = stateStr ? (JSON.parse(stateStr) as MonitorState) : undefined

  // Bail out before any hooks if SSR couldn't read the KV.
  if (!initialState) {
    return (
      <>
        <Head>
          <title>{pageConfig.title}</title>
          <link rel="icon" href={pageConfig.favicon ?? '/favicon.ico'} />
        </Head>
        <main className={inter.className}>
          <Header />
          <Center mt="xl">
            <Text fw={700}>
              Monitor State is not defined now, please check your worker&apos;s status and KV
              binding!
            </Text>
          </Center>
          <Footer />
        </main>
      </>
    )
  }

  return <Dashboard initialState={initialState} initialMonitors={monitors} />
}

function Dashboard({
  initialState,
  initialMonitors,
}: {
  initialState: MonitorState
  initialMonitors: MonitorTarget[]
}) {
  const [prefs, setPrefs] = useViewPreferences()
  const { state, monitors, lastFetched, isRefreshing, refresh } = useLiveState(
    { state: initialState, monitors: initialMonitors },
    { enabled: prefs.autoRefresh }
  )

  // Selected monitor for detail modal (replaces URL hash drill-down)
  const [selected, setSelected] = useState<MonitorTarget | null>(null)

  // URL hash one-shot drill-down (kept for iframe / deep-link compatibility)
  const hashMonitorId =
    typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
  if (hashMonitorId) {
    const monitor = monitors.find((m) => m.id === hashMonitorId)
    if (monitor) {
      return (
        <>
          <Head>
            <title>{pageConfig.title}</title>
            <link rel="icon" href={pageConfig.favicon ?? '/favicon.ico'} />
          </Head>
          <main className={`${inter.className} page-shell`}>
            <div className="page-main" style={{ maxWidth: '900px' }}>
              <MonitorDetailModal
                monitor={monitor}
                state={state}
                timeRange={prefs.timeRange}
                opened
                onClose={() => {
                  if (typeof window !== 'undefined')
                    window.location.hash = ''
                }}
              />
            </div>
          </main>
        </>
      )
    }
  }

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href={pageConfig.favicon ?? '/favicon.ico'} />
      </Head>

      <div className={`${inter.className} page-shell`}>
        <Header />

        <main className="page-main">
          <StatusHero state={state} monitors={monitors} maintenances={maintenances} />

          <Toolbar
            search={prefs.search}
            onSearchChange={(q) => setPrefs({ search: q })}
            viewMode={prefs.viewMode}
            onViewModeChange={(m) => setPrefs({ viewMode: m })}
            timeRange={prefs.timeRange}
            onTimeRangeChange={(r) => setPrefs({ timeRange: r })}
            onRefresh={refresh}
            isRefreshing={isRefreshing}
            lastFetchedAgo={relativeTime(lastFetched)}
          />

          <MonitorGrid
            monitors={monitors}
            state={state}
            search={prefs.search}
            viewMode={prefs.viewMode}
            timeRange={prefs.timeRange}
            expandedGroups={
              prefs.expandedGroups.length === 0
                ? Object.keys(pageConfig.group ?? {})
                : prefs.expandedGroups
            }
            onExpandedGroupsChange={(g) => setPrefs({ expandedGroups: g })}
            onSelect={(m) => setSelected(m)}
          />

          <MonitorDetailModal
            monitor={selected}
            state={state}
            timeRange={prefs.timeRange}
            opened={!!selected}
            onClose={() => setSelected(null)}
          />
        </main>

        <Footer />
      </div>
    </>
  )
}

export async function getServerSideProps() {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const state = (await UPTIMEFLARE_STATE?.get('state')) as unknown as MonitorState

  const monitors = workerConfig.monitors.map((monitor) => {
    return {
      id: monitor.id,
      name: monitor.name,
      // @ts-ignore
      tooltip: monitor?.tooltip,
      // @ts-ignore
      statusPageLink: monitor?.statusPageLink,
      // @ts-ignore
      hideLatencyChart: monitor?.hideLatencyChart,
    }
  })

  return { props: { state, monitors } }
}
