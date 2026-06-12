import '@mantine/core/styles.css'
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { MantineProvider } from '@mantine/core'
import { Chakra_Petch, IBM_Plex_Mono } from 'next/font/google'
import NoSsr from '@/components/NoSsr'
import { theme } from '@/styles/theme'

// Display face: squared, tactical — carries headings, monitor names, badges.
const display = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

// Data face: every number, timestamp and readout renders in mono.
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Font vars on :root so Mantine portals (tooltips, modals, dropdowns)
          rendered outside the page tree still resolve them. */}
      <style jsx global>{`
        :root {
          --font-display: ${display.style.fontFamily};
          --font-mono: ${mono.style.fontFamily};
        }
      `}</style>
      <NoSsr>
        <MantineProvider theme={theme} forceColorScheme="dark">
          <Component {...pageProps} />
        </MantineProvider>
      </NoSsr>
    </>
  )
}
