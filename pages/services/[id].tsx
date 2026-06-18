import { Center, Container, Text } from '@mantine/core'
import type { KVNamespace } from '@cloudflare/workers-types'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PageHead from '@/components/PageHead'
import MonitorDetailPanel from '@/components/MonitorDetailPanel'
import SubscriptionLinks from '@/components/SubscriptionLinks'
import type { MonitorState, MonitorTarget } from '@/types/config'
import { pageConfig, workerConfig } from '@/uptime.config'

export const runtime = 'experimental-edge'

export default function ServiceStatusPage({
  state: stateStr,
  monitor,
}: {
  state: string | null
  monitor: MonitorTarget | null
}) {
  const state = stateStr ? (JSON.parse(stateStr) as MonitorState) : undefined
  const title = monitor ? `${monitor.name} · ${pageConfig.title}` : pageConfig.title

  return (
    <>
      <PageHead
        title={title}
        description={
          monitor
            ? `${monitor.name} 的可用性、响应时间、Uptime 和事件历史。`
            : pageConfig.description
        }
        path={monitor ? `/services/${encodeURIComponent(monitor.id)}` : '/'}
      />

      <main className="page-shell">
        <Header />
        <Container size="md" className="page-main" py="xl">
          {!state || !monitor ? (
            <Center mih={260}>
              <Text fw={700}>{monitor ? 'Status data is not available.' : 'Monitor not found.'}</Text>
            </Center>
          ) : (
            <>
              <MonitorDetailPanel monitor={monitor} state={state} timeRange="30d" />
              <div style={{ marginTop: 16 }}>
                <SubscriptionLinks />
              </div>
            </>
          )}
        </Container>
        <Footer />
      </main>
    </>
  )
}

export async function getServerSideProps({ params }: { params: { id?: string } }) {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  const id = params.id ? decodeURIComponent(params.id) : ''
  const monitor = workerConfig.monitors.find((item) => item.id === id) ?? null
  const state = (await UPTIMEFLARE_STATE?.get('state')) ?? null

  return { props: { state, monitor } }
}
