/**
 * Chrome around the views: navigation, search box, and route dispatch.
 *
 * Fleet's whole shape is "broad overview → narrow down → jump out", so the
 * shell stays deliberately thin: three cross-project destinations, a search
 * box, and whatever view the hash names.
 */
import {Box, Button, Card, Container, Flex, Inline, Stack, Text, TextInput} from '@sanity/ui'
import {Suspense, useState, type JSX} from 'react'
import {CrossView} from './cross/CrossView'
import {FleetView} from './fleet/FleetView'
import {ProjectView} from './project/ProjectView'
import {useRoute, type Route} from './routes'
import {ErrorBoundary} from './ui/ErrorBoundary'
import {CardSkeleton, ErrorCard} from './ui/primitives'

export function AppShell(): JSX.Element {
  const {route, navigate} = useRoute()

  return (
    <Container width={5} paddingX={4} paddingY={5}>
      <Stack gap={5}>
        <Header route={route} navigate={navigate} />
        <ErrorBoundary fallback={(error) => <ErrorCard title="Fleet" error={error} />}>
          <Suspense fallback={<CardSkeleton height={200} />}>
            <RouteView route={route} navigate={navigate} />
          </Suspense>
        </ErrorBoundary>
      </Stack>
    </Container>
  )
}

function RouteView({route, navigate}: {route: Route; navigate: (route: Route) => void}) {
  switch (route.name) {
    case 'project':
      return (
        <ProjectView
          projectId={route.projectId}
          onBack={() => navigate({name: 'fleet'})}
        />
      )
    case 'drafts':
      return <CrossView mode="drafts" />
    case 'stale':
      return <CrossView mode="stale" />
    case 'search':
      return <CrossView mode="search" query={route.q} />
    case 'fleet':
    default:
      return <FleetView onOpenProject={(projectId) => navigate({name: 'project', projectId})} />
  }
}

function Header({route, navigate}: {route: Route; navigate: (route: Route) => void}) {
  const [term, setTerm] = useState(route.name === 'search' ? route.q : '')

  return (
    <Card padding={4} radius={3} shadow={1}>
      <Flex align="center" gap={4} wrap="wrap">
        <Box>
          <Stack gap={2}>
            <Text size={2} weight="bold">
              Fleet
            </Text>
            <Text size={0} muted>
              Every project, one view
            </Text>
          </Stack>
        </Box>

        <Inline gap={2}>
          <NavButton label="Fleet" active={route.name === 'fleet'} onClick={() => navigate({name: 'fleet'})} />
          <NavButton label="Drafts" active={route.name === 'drafts'} onClick={() => navigate({name: 'drafts'})} />
          <NavButton label="Stale" active={route.name === 'stale'} onClick={() => navigate({name: 'stale'})} />
        </Inline>

        <Box flex={1} style={{minWidth: 220}}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              navigate({name: 'search', q: term})
            }}
          >
            <TextInput
              fontSize={1}
              placeholder="Search every project…"
              value={term}
              onChange={(event) => setTerm(event.currentTarget.value)}
            />
          </form>
        </Box>
      </Flex>
    </Card>
  )
}

function NavButton({label, active, onClick}: {label: string; active: boolean; onClick: () => void}) {
  return (
    <Button
      fontSize={1}
      mode={active ? 'default' : 'bleed'}
      tone={active ? 'primary' : 'default'}
      text={label}
      onClick={onClick}
    />
  )
}
