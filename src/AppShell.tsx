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
import {CloseIcon} from '@sanity/icons/Close'
import {MenuIcon} from '@sanity/icons/Menu'
import {SearchIcon} from '@sanity/icons/Search'
import {useOrganizations, useProjects} from '@sanity/sdk-react'
import {Box, Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {Suspense, useEffect, useMemo, useState, type JSX} from 'react'
import {ContentArea} from './ContentArea'
import {usePrefs} from './lib/PrefsContext'
import {hiddenProjects, visibleProjects} from './lib/projects'
import {useIsMobile} from './lib/useViewport'
import {useRoute, type Route} from './routes'
import {ErrorBoundary} from './ui/ErrorBoundary'
import {CardSkeleton, ErrorCard, SkeletonLine} from './ui/primitives'
import {Sidebar} from './ui/Sidebar'

const SIDEBAR_WIDTH = 236

export function AppShell(): JSX.Element {
  const {route, navigate} = useRoute()
  const isMobile = useIsMobile()
  const [railOpen, setRailOpen] = useState(false)

  // Navigating on a phone should close the rail: it covers the content it
  // just navigated to.
  const hash = routeKey(route)
  useEffect(() => {
    setRailOpen(false)
  }, [hash])

  const rail = (
    <ErrorBoundary fallback={() => null}>
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarData route={route} navigate={navigate} />
      </Suspense>
    </ErrorBoundary>
  )

  return (
    <Box padding={isMobile ? 0 : 2} style={{height: '100dvh'}}>
      <Card
        radius={isMobile ? 0 : 4}
        shadow={isMobile ? 0 : 1}
        style={{height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}
      >
        <Header
          route={route}
          navigate={navigate}
          isMobile={isMobile}
          railOpen={railOpen}
          onToggleRail={() => setRailOpen((open) => !open)}
        />

        <Flex flex={1} style={{minHeight: 0, position: 'relative'}}>
          {isMobile ? (
            railOpen && (
              <>
                {/* The rail overlays the content rather than displacing it —
                    at this width there is no room to do both. */}
                <Box
                  onClick={() => setRailOpen(false)}
                  style={{position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(0,0,0,0.5)'}}
                />
                <Card
                  borderRight
                  style={{
                    position: 'absolute',
                    insetBlock: 0,
                    left: 0,
                    width: 'min(84vw, 300px)',
                    zIndex: 2,
                    overflowY: 'auto',
                  }}
                >
                  {rail}
                </Card>
              </>
            )
          ) : (
            <Card
              borderRight
              tone="transparent"
              style={{width: SIDEBAR_WIDTH, flex: 'none', overflowY: 'auto'}}
            >
              {rail}
            </Card>
          )}

          <Box flex={1} style={{overflowY: 'auto', minWidth: 0}}>
            <ErrorBoundary fallback={(error) => <ErrorCard title="Fleet" error={error} />}>
              <Suspense
                fallback={
                  <Box padding={4}>
                    <CardSkeleton height={200} />
                  </Box>
                }
              >
                <ContentArea route={route} navigate={navigate} />
              </Suspense>
            </ErrorBoundary>
          </Box>
        </Flex>
      </Card>
    </Box>
  )
}

function routeKey(route: Route): string {
  return `${route.scope.kind}:${'id' in route.scope ? route.scope.id : ''}:${route.view}:${route.q ?? ''}`
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

function Header({
  route,
  navigate,
  isMobile,
  railOpen,
  onToggleRail,
}: {
  route: Route
  navigate: (route: Route) => void
  isMobile: boolean
  railOpen: boolean
  onToggleRail: () => void
}) {
  const [term, setTerm] = useState(route.q ?? '')
  const [searchOpen, setSearchOpen] = useState(false)

  // Left inset matches the rail's own, so the mark lines up with the items
  // below it; right inset matches the content's, so the search field lands on
  // the same edge as the table beneath it.
  return (
    <Card borderBottom paddingLeft={2} paddingRight={4} paddingY={2} style={{flex: 'none'}}>
      <Flex align="center" gap={2}>
        {isMobile && (
          <Button
            mode="bleed"
            fontSize={1}
            padding={2}
            icon={railOpen ? CloseIcon : MenuIcon}
            aria-label={railOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={railOpen}
            onClick={onToggleRail}
          />
        )}

        <Box style={isMobile ? undefined : {width: SIDEBAR_WIDTH - 24, flex: 'none'}}>
          {/* Indented to sit on the same line as the rail's icons below. */}
          <Flex align="center" gap={3} paddingLeft={1}>
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

        {isMobile ? (
          <>
            <Box flex={1} />
            <Button
              mode="bleed"
              fontSize={1}
              padding={2}
              icon={SearchIcon}
              aria-label="Find documents"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            />
          </>
        ) : (
          <>
            {/* Search sits at the far end of the header, opposite the
                identity: it acts on everything, so it belongs to the app bar
                rather than to the column it happened to sit above. */}
            <Box flex={1} />
            <Box style={{width: 300, flex: 'none'}}>
              <SearchForm
                term={term}
                setTerm={setTerm}
                navigate={navigate}
                placeholder="Find documents…"
              />
            </Box>
          </>
        )}
      </Flex>

      {isMobile && searchOpen && (
        <Box paddingTop={2}>
          <SearchForm term={term} setTerm={setTerm} navigate={navigate} placeholder="Find documents…" autoFocus />
        </Box>
      )}
    </Card>
  )
}

function SearchForm({
  term,
  setTerm,
  navigate,
  placeholder,
  autoFocus,
}: {
  term: string
  setTerm: (value: string) => void
  navigate: (route: Route) => void
  placeholder: string
  autoFocus?: boolean
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        navigate({scope: {kind: 'all'}, view: 'overview', q: term})
      }}
    >
      <TextInput
        fontSize={1}
        icon={SearchIcon}
        placeholder={placeholder}
        radius={2}
        autoFocus={autoFocus}
        value={term}
        onChange={(event) => setTerm(event.currentTarget.value)}
      />
    </form>
  )
}
