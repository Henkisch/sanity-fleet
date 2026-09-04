import {SanityApp} from '@sanity/sdk-react'
import {Card, Flex, Spinner, ThemeProvider, usePrefersDark} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import '@sanity/ui/styles.css'
import './global.css'
import type {JSX} from 'react'
import {AppShell} from './AppShell'
import {bootstrapConfig} from './config'
import {PrefsProvider} from './lib/PrefsContext'

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
