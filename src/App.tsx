import {SanityApp} from '@sanity/sdk-react'
import {Card, Flex, Spinner, ThemeProvider, usePrefersDark} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
/*
 * Self-hosted, like Studio: a webfont fetched from a CDN at runtime may never
 * arrive, and the whole interface silently falls back to the system stack.
 *
 * The static package, not the variable one: `@fontsource-variable/inter`
 * registers the family as "Inter Variable", which never matches the theme's
 * request for "Inter" — the faces load and go unused. Weights match the ones
 * Sanity's own interface loads.
 */
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@sanity/ui/styles.css'
import './global.css'
import type {JSX} from 'react'
import {AppShell} from './AppShell'
import {bootstrapConfig} from './config'
import {PrefsProvider} from './lib/PrefsContext'

/*
 * `sanity build` drops `app.title` from the generated index.html — its Vite
 * plugin renders the document without a title, so the bundle ships the CLI's
 * "Sanity App" fallback while `sanity dev` renders "Fleet" correctly. The
 * Dashboard titles the browser tab from this document, so set it here.
 */
document.title = 'Fleet'

const theme = buildTheme()

function Loading(): JSX.Element {
  return (
    <Flex align="center" justify="center" style={{minHeight: '100vh'}}>
      <Spinner muted />
    </Flex>
  )
}

function App(): JSX.Element {
  const prefersDark = usePrefersDark()

  return (
    <ThemeProvider theme={theme} scheme={prefersDark ? 'dark' : 'light'}>
      <Card tone="transparent" style={{minHeight: '100vh'}}>
        {/*
          Fleet reaches many projects, and every query names its own project and
          dataset. The config below is only the instance's default resource —
          see src/config.ts.
        */}
        <SanityApp config={bootstrapConfig} fallback={<Loading />}>
          <PrefsProvider>
            <AppShell />
          </PrefsProvider>
        </SanityApp>
      </Card>
    </ThemeProvider>
  )
}

export default App
