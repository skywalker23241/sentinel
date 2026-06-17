import Head from 'next/head'

import { MaintenanceConfig, MonitorState, MonitorTarget } from '@/types/config'
import { maintenances, pageConfig, workerConfig } from '@/uptime.config'
import Header from '@/components/Header'
import { Box, Button, Center, Container, Group, Select, Text } from '@mantine/core'
import Footer from '@/components/Footer'
import { useEffect, useState } from 'react'
import MaintenanceAlert from '@/components/MaintenanceAlert'
import NoIncidentsAlert from '@/components/NoIncidents'
import IncidentCard, { type DerivedIncident } from '@/components/IncidentCard'
import type { KVNamespace } from '@cloudflare/workers-types'

export const runtime = 'experimental-edge'

function getSelectedMonth() {
  const hash = window.location.hash.replace('#', '')
  if (!hash) {
    const now = new Date()
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  }
  return hash.split('-').splice(0, 2).join('-')
}

function monthOf(date: Date): string {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
}

/** Build the real (monitoring-detected) incident list from KV state. */
function deriveIncidents(
  state: MonitorState | undefined,
  monitors: MonitorTarget[]
): DerivedIncident[] {
  if (!state) return []
  const out: DerivedIncident[] = []
  for (const m of monitors) {
    for (const inc of state.incident[m.id] ?? []) {
      // The worker seeds a placeholder 'dummy' incident; never surface it.
      if (inc.error?.[0] === 'dummy') continue
      out.push({
        monitorId: m.id,
        monitorName: m.name,
        start: inc.start[0],
        end: inc.end,
        reason: inc.error[inc.error.length - 1] ?? 'unspecified',
        ongoing: inc.end === undefined,
        // Worker-detected incidents default to 'outage' until classified.
        severity: inc.severity ?? 'outage',
      })
    }
  }
  return out
}

function filterMaintenancesByMonth(
  items: MaintenanceConfig[],
  monthStr: string
): (Omit<MaintenanceConfig, 'monitors'> & { monitors: MonitorTarget[] })[] {
  return items
    .filter((m) => monthOf(new Date(m.start)) === monthStr)
    .map((e) => ({
      ...e,
      monitors: (e.monitors || []).map((id) => workerConfig.monitors.find((mon) => mon.id === id)!),
    }))
    .sort((a, b) => (new Date(a.start) > new Date(b.start) ? -1 : 1))
}

function getPrevNextMonth(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1)
  const prev = new Date(date)
  prev.setMonth(prev.getMonth() - 1)
  const next = new Date(date)
  next.setMonth(next.getMonth() + 1)
  return { prev: monthOf(prev), next: monthOf(next) }
}

export default function IncidentsPage({
  state: stateStr,
  monitors,
}: {
  state: string | null
  monitors: MonitorTarget[]
}) {
  const state = stateStr ? (JSON.parse(stateStr) as MonitorState) : undefined

  const [selectedMonitor, setSelectedMonitor] = useState<string | null>('')
  const [selectedMonth, setSelectedMonth] = useState(getSelectedMonth())

  useEffect(() => {
    const onHashChange = () => setSelectedMonth(getSelectedMonth())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Real incidents for the selected month (+ optional monitor filter).
  const allIncidents = deriveIncidents(state, monitors)
  const incidents = allIncidents
    .filter((i) => monthOf(new Date(i.start * 1000)) === selectedMonth)
    .filter((i) => !selectedMonitor || i.monitorId === selectedMonitor)
    .sort((a, b) => b.start - a.start)

  // Planned maintenances for the same month.
  const monthMaintenances = filterMaintenancesByMonth(maintenances, selectedMonth).filter(
    (m) => !selectedMonitor || m.monitors.some((mon) => mon?.id === selectedMonitor)
  )

  const { prev, next } = getPrevNextMonth(selectedMonth)
  const nothing = incidents.length === 0 && monthMaintenances.length === 0

  const monitorOptions = [
    { value: '', label: 'All' },
    ...workerConfig.monitors.map((monitor) => ({
      value: monitor.id,
      label: monitor.name,
    })),
  ]

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href={pageConfig.favicon ?? '/favicon.ico'} />
      </Head>

      <main className="page-shell">
        <Header style={{ marginBottom: '40px' }} />
        <Center>
          <Container size="md" style={{ width: '100%' }}>
            <Group justify="end" mb="md">
              <Select
                placeholder="Select monitor"
                data={monitorOptions}
                value={selectedMonitor}
                onChange={setSelectedMonitor}
                clearable
                style={{ maxWidth: 300, float: 'right' }}
              />
            </Group>

            <Box>
              {nothing ? (
                <NoIncidentsAlert />
              ) : (
                <>
                  {incidents.length > 0 && (
                    <>
                      <Text fw={600} mb="xs" c="dimmed" size="sm">
                        Incidents
                      </Text>
                      {incidents.map((incident, i) => (
                        <IncidentCard key={`inc-${i}`} incident={incident} />
                      ))}
                    </>
                  )}
                  {monthMaintenances.length > 0 && (
                    <>
                      <Text fw={600} mt={incidents.length > 0 ? 'lg' : 0} mb="xs" c="dimmed" size="sm">
                        Maintenance
                      </Text>
                      {monthMaintenances.map((m, i) => (
                        <MaintenanceAlert key={`mnt-${i}`} maintenance={m} />
                      ))}
                    </>
                  )}
                </>
              )}
            </Box>

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => (window.location.hash = prev)}>
                ← Backwards
              </Button>
              <Box style={{ alignSelf: 'center', fontWeight: 500, fontSize: 18 }}>
                {selectedMonth}
              </Box>
              <Button variant="default" onClick={() => (window.location.hash = next)}>
                Forward →
              </Button>
            </Group>
          </Container>
        </Center>
        <Footer />
      </main>
    </>
  )
}

export async function getServerSideProps() {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const state = (await UPTIMEFLARE_STATE?.get('state')) ?? null

  const monitors = workerConfig.monitors.map((monitor) => ({
    id: monitor.id,
    name: monitor.name,
  }))

  return { props: { state, monitors } }
}
