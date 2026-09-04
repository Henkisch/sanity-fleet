/**
 * The application frame: header, navigation rail, content.
 *
 * The frame is inset from the window edge and rounded, the way the Sanity
 * Dashboard presents an application — the app reads as a surface placed on the
 * desk rather than as the desk itself.
 *
 * The rail needs the project list, which is a suspending fetch, so it sits
 * behind its own boundary: neither the header nor the content should wait on
 * navigation chrome.
 */
import {SearchIcon} from '@sanity/icons/Search'
import {useOrganizations, useProjects} from '@sanity/sdk-react'
import {Box, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {Suspense, useMemo, useState, type JSX} from 'react'
import {ContentArea} from './ContentArea'
import {usePrefs} from './lib/PrefsContext'
import {hiddenProjects, visibleProjects} from './lib/projects'
import {useRoute, type Route} from './routes'
import {ErrorBoundary} from './ui/ErrorBoundary'
import {CardSkeleton, ErrorCard, SkeletonLine} from './ui/primitives'
import {Sidebar} from './ui/Sidebar'

const SIDEBAR_WIDTH = 236

export function AppShell(): JSX.Element {
  const {route, navigate} = useRoute()

  return (
    <Box padding={2} style={{height: '100vh'}}>
      <Card
        radius={4}
        shadow={1}
        style={{height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}
      >
        <Header route={route} navigate={navigate} />

        <Flex flex={1} style={{minHeight: 0}}>
          <Card
            borderRight
            tone="transparent"
            style={{width: SIDEBAR_WIDTH, flex: 'none', overflowY: 'auto'}}
          >
            <ErrorBoundary fallback={() => null}>
              <Suspense fallback={<SidebarSkeleton />}>
                <SidebarData route={route} navigate={navigate} />
              </Suspense>
            </ErrorBoundary>
          </Card>

          <Box flex={1} style={{overflowY: 'auto', minWidth: 0}}>
            <ErrorBoundary fallback={(error) => <ErrorCard title="Fleet" error={error} />}>
              <Suspense fallback={<Box padding={4}><CardSkeleton height={200} /></Box>}>
                <ContentArea route={route} navigate={navigate} />
              </Suspense>
            </ErrorBoundary>
          </Box>
        </Flex>
      </Card>
    </Box>
  )
}

function SidebarData({route, navigate}: {route: Route; navigate: (route: Route) => void}) {
  const {prefs, update, setHidden, toggleOrg} = usePrefs()
  const {data: projects} = useProjects()
  const {data: organizations} = useOrganizations()

  const groups = useMemo(() => {
    const visible = visibleProjects(projects, prefs)
    return organizations
      .map((org) => ({
        id: org.id,
        name: org.name,
        projects: visible.filter((project) => project.organizationId === org.id),
      }))
      .filter((org) => org.projects.length > 0)
  }, [projects, organizations, prefs])

  const hidden = useMemo(() => hiddenProjects(projects, prefs), [projects, prefs])

  return (
    <Sidebar
      organizations={groups}
      hidden={hidden}
      expandedOrgs={prefs.expandedOrgs}
      showHidden={prefs.showHidden}
      onToggleOrg={toggleOrg}
      onToggleShowHidden={(showHidden) => update({showHidden})}
      onSetHidden={setHidden}
      route={route}
      navigate={navigate}
    />
  )
}

function SidebarSkeleton() {
  return (
    <Stack gap={3} padding={4}>
      <SkeletonLine width="60%" />
      <SkeletonLine width="80%" />
      <SkeletonLine width="70%" />
    </Stack>
  )
}

function Header({route, navigate}: {route: Route; navigate: (route: Route) => void}) {
  const [term, setTerm] = useState(route.q ?? '')

  return (
    <Card borderBottom paddingX={3} paddingY={2} style={{flex: 'none'}}>
      <Flex align="center" gap={3}>
        <Box style={{width: SIDEBAR_WIDTH - 24, flex: 'none'}}>
          <Flex align="center" gap={3} paddingX={2}>
            <Box
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                background: 'var(--card-badge-primary-dot-color, #6a7bff)',
                flex: 'none',
              }}
            />
            <Text size={1} weight="semibold">
              Fleet
            </Text>
          </Flex>
        </Box>

        <Box flex={1} style={{maxWidth: 420}}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              navigate({scope: {kind: 'all'}, view: 'overview', q: term})
            }}
          >
            <TextInput
              fontSize={1}
              icon={SearchIcon}
              placeholder="Find documents…"
              radius={2}
              value={term}
              onChange={(event) => setTerm(event.currentTarget.value)}
            />
          </form>
        </Box>

        <Box flex={1} />
      </Flex>
    </Card>
  )
}
