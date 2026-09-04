/**
 * The content area: a scope header with its view tabs, and the view below.
 *
 * Overview / Drafts / Stale are lenses on the current scope, not places, so
 * they live here next to the thing they describe. Switching scope in the rail
 * keeps the lens; switching lens keeps the scope.
 */
import {useOrganizations, useProject, useProjects} from '@sanity/sdk-react'
import {Box, Flex, Heading, Stack, Tab, TabList, Text} from '@sanity/ui'
import {Suspense, useMemo, type JSX} from 'react'
import {CrossView} from './cross/CrossView'
import {FleetView} from './fleet/FleetView'
import {usePrefs} from './lib/PrefsContext'
import {hiddenProjects, visibleProjects, type QueryableProject} from './lib/projects'
import {ProjectView} from './project/ProjectView'
import type {Route, Scope, View} from './routes'
import {ErrorBoundary} from './ui/ErrorBoundary'
import {CardSkeleton} from './ui/primitives'

const VIEWS: {id: View; label: string}[] = [
  {id: 'overview', label: 'Overview'},
  {id: 'drafts', label: 'Drafts'},
  {id: 'stale', label: 'Stale'},
]

interface ContentAreaProps {
  route: Route
  navigate: (route: Route) => void
}

export function ContentArea({route, navigate}: ContentAreaProps): JSX.Element {
  const {prefs} = usePrefs()
  const {data: projects} = useProjects()

  const scopedProjects = useMemo(() => {
    // A hidden project is still reachable by URL and from the Hidden section,
    // so scoping to one includes it — hiding removes a project from the lists,
    // not from the app.
    const pool =
      route.scope.kind === 'project'
        ? [...visibleProjects(projects, prefs), ...hiddenProjects(projects, prefs)]
        : visibleProjects(projects, prefs)
    return projectsInScope(pool, route.scope)
  }, [projects, prefs, route.scope])

  // Search is its own destination: it spans everything by definition, so it
  // replaces the scope header rather than living inside one.
  if (route.q) {
    return (
      <Box padding={4}>
        <CrossView mode="search" query={route.q} projects={scopedProjects} />
      </Box>
    )
  }

  return (
    <Stack>
      <Box paddingX={4} paddingTop={4}>
        <Stack gap={3}>
          <ScopeHeading scope={route.scope} count={scopedProjects.length} />
          <TabList gap={1}>
            {VIEWS.map((view) => (
              <Tab
                key={view.id}
                id={`view-${view.id}`}
                aria-controls="view-panel"
                label={view.label}
                selected={route.view === view.id}
                onClick={() => navigate({scope: route.scope, view: view.id})}
              />
            ))}
          </TabList>
        </Stack>
      </Box>

      <Box id="view-panel" paddingX={4} paddingTop={3} paddingBottom={4}>
        <ErrorBoundary
          fallback={(error) => <ErrorPanel error={error} />}
          resetKey={`${route.scope.kind}:${'id' in route.scope ? route.scope.id : 'all'}:${route.view}`}
        >
          <Suspense fallback={<CardSkeleton height={200} />}>
            <ViewPanel route={route} navigate={navigate} projects={scopedProjects} />
          </Suspense>
        </ErrorBoundary>
      </Box>
    </Stack>
  )
}

function ViewPanel({
  route,
  navigate,
  projects,
}: ContentAreaProps & {projects: QueryableProject[]}) {
  if (route.view !== 'overview') {
    return <CrossView mode={route.view} projects={projects} />
  }

  if (route.scope.kind === 'project') {
    return <ProjectView projectId={route.scope.id} />
  }

  return (
    <FleetView
      projects={projects}
      onOpenProject={(projectId) => navigate({scope: {kind: 'project', id: projectId}, view: 'overview'})}
    />
  )
}

function ScopeHeading({scope, count}: {scope: Scope; count: number}) {
  // Title and count share a line: on a phone every stacked row is scroll
  // between the user and the data they opened the app for.
  return (
    <Flex align="baseline" gap={3}>
      <Suspense fallback={<Heading size={2}>…</Heading>}>
        <ScopeTitle scope={scope} />
      </Suspense>
      {scope.kind !== 'project' && (
        <Text size={1} muted>
          {count}
        </Text>
      )}
    </Flex>
  )
}

function ScopeTitle({scope}: {scope: Scope}) {
  const {data: organizations} = useOrganizations()

  if (scope.kind === 'project') return <ProjectTitle projectId={scope.id} />
  if (scope.kind === 'organization') {
    const org = organizations.find((entry) => entry.id === scope.id)
    return <Heading size={2}>{org?.name ?? 'Organization'}</Heading>
  }
  return <Heading size={2}>All projects</Heading>
}

function ProjectTitle({projectId}: {projectId: string}) {
  const {data: project} = useProject({projectId})
  return <Heading size={2}>{project.displayName}</Heading>
}

function ErrorPanel({error}: {error: unknown}) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <Flex align="center" justify="center" padding={5}>
      <Text muted size={1}>
        {message}
      </Text>
    </Flex>
  )
}

function projectsInScope(projects: QueryableProject[], scope: Scope): QueryableProject[] {
  switch (scope.kind) {
    case 'organization':
      return projects.filter((project) => project.organizationId === scope.id)
    case 'project':
      return projects.filter((project) => project.id === scope.id)
    case 'all':
    default:
      return projects
  }
}
