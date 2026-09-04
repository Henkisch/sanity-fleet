/**
 * The fleet grid: every project the current user can reach, one card each.
 *
 * `useProjects` returns projects across every organization the user belongs to,
 * so organizations are a grouping and a filter here, not a boundary.
 */
import {useOrganizations, useProjects} from '@sanity/sdk-react'
import {Box, Button, Card, Checkbox, Flex, Grid, Inline, Select, Stack, Text} from '@sanity/ui'
import {useMemo, type JSX} from 'react'
import {usePrefs} from '../lib/PrefsContext'
import {visibleProjects} from '../lib/projects'
import {ProjectCard, type FleetProject} from './ProjectCard'

interface FleetViewProps {
  onOpenProject: (projectId: string) => void
}

export function FleetView({onOpenProject}: FleetViewProps): JSX.Element {
  const {prefs, update} = usePrefs()
  const {data: projects, isFetching, refetch} = useProjects()
  const {data: organizations} = useOrganizations()

  const orgName = useMemo(() => {
    const byId = new Map(organizations.map((org) => [org.id, org.name]))
    return (id: string) => byId.get(id) ?? 'Unknown organization'
  }, [organizations])

  const visible = useMemo(() => visibleProjects(projects, prefs), [projects, prefs])

  const grouped = useMemo(() => {
    const groups = new Map<string, FleetProject[]>()
    for (const project of visible) {
      const list = groups.get(project.organizationId) ?? []
      list.push(project)
      groups.set(project.organizationId, list)
    }
    return [...groups.entries()].sort(([a], [b]) => orgName(a).localeCompare(orgName(b), 'sv'))
  }, [visible, orgName])

  return (
    <Stack gap={5}>
      <Card padding={3} radius={3} tone="transparent">
        <Flex align="center" gap={4} wrap="wrap">
          <Inline gap={2}>
            <Text size={1} muted>
              Stale after
            </Text>
            <Select
              fontSize={1}
              value={String(prefs.staleDays)}
              onChange={(event) => update({staleDays: Number(event.currentTarget.value)})}
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">365 days</option>
            </Select>
          </Inline>

          <Flex align="center" gap={2}>
            <Checkbox
              id="attention-only"
              checked={prefs.attentionOnly}
              onChange={(event) => update({attentionOnly: event.currentTarget.checked})}
            />
            <Text size={1} as="label" htmlFor="attention-only">
              Needs attention only
            </Text>
          </Flex>

          <Box flex={1} />

          <Button
            fontSize={1}
            mode="bleed"
            text={isFetching ? 'Refreshing…' : 'Refresh'}
            disabled={isFetching}
            onClick={() => refetch()}
          />
        </Flex>
      </Card>

      {grouped.map(([organizationId, orgProjects]) => (
        <Stack key={organizationId} gap={3}>
          <Text size={1} muted weight="semibold">
            {orgName(organizationId)} · {orgProjects.length} projects
          </Text>
          <Grid gridTemplateColumns={[1, 1, 2, 3]} gap={3}>
            {orgProjects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
            ))}
          </Grid>
        </Stack>
      ))}

      {grouped.length === 0 && (
        <Card padding={5} radius={3} tone="transparent">
          <Text align="center" muted size={1}>
            No projects match the current filters.
          </Text>
        </Card>
      )}
    </Stack>
  )
}
