/**
 * The fleet grid: the projects of one organization, one card each.
 *
 * An overview stops being an overview when everything is on screen at once.
 * Two rules keep it readable:
 *
 *   One organization at a time. `useProjects` reaches across every
 *   organization the user belongs to, but they are separate mental contexts —
 *   showing them stacked means scrolling past one to reach the other. Tabs
 *   match how the Dashboard itself separates organizations.
 *
 *   Sorted by what needs attention. Projects with drafts waiting sort first,
 *   so the top of the grid is the answer to "what needs me today".
 */
import {useOrganizations, useProjects} from '@sanity/sdk-react'
import {Box, Button, Card, Checkbox, Flex, Grid, Inline, Select, Stack, Tab, TabList, Text} from '@sanity/ui'
import {useMemo, useState, type JSX} from 'react'
import {usePrefs} from '../lib/PrefsContext'
import {visibleProjects} from '../lib/projects'
import {ProjectCard} from './ProjectCard'

interface FleetViewProps {
  onOpenProject: (projectId: string) => void
}

export function FleetView({onOpenProject}: FleetViewProps): JSX.Element {
  const {prefs, update} = usePrefs()
  const {data: projects, isFetching, refetch} = useProjects()
  const {data: organizations} = useOrganizations()

  const byOrg = useMemo(() => {
    const visible = visibleProjects(projects, prefs)
    const groups = new Map<string, typeof visible>()
    for (const project of visible) {
      groups.set(project.organizationId, [...(groups.get(project.organizationId) ?? []), project])
    }
    return organizations
      .filter((org) => groups.has(org.id))
      .map((org) => ({id: org.id, name: org.name, projects: groups.get(org.id) ?? []}))
  }, [projects, organizations, prefs])

  const [activeOrg, setActiveOrg] = useState<string | null>(null)
  const current = byOrg.find((org) => org.id === activeOrg) ?? byOrg[0]

  if (!current) {
    return (
      <Card padding={5} radius={3} tone="transparent">
        <Text align="center" muted size={1}>
          No projects available.
        </Text>
      </Card>
    )
  }

  return (
    <Stack gap={4}>
      <Flex align="center" gap={4} wrap="wrap">
        <TabList gap={1}>
          {byOrg.map((org) => (
            <Tab
              key={org.id}
              id={`org-${org.id}`}
              aria-controls="org-panel"
              label={`${org.name} (${org.projects.length})`}
              selected={org.id === current.id}
              onClick={() => setActiveOrg(org.id)}
            />
          ))}
        </TabList>

        <Box flex={1} />

        <Flex align="center" gap={2}>
          <Checkbox
            id="attention-only"
            checked={prefs.attentionOnly}
            onChange={(event) => update({attentionOnly: event.currentTarget.checked})}
          />
          <Text size={1} as="label" htmlFor="attention-only" muted>
            Needs attention
          </Text>
        </Flex>

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

        <Button
          fontSize={1}
          mode="bleed"
          text={isFetching ? 'Refreshing…' : 'Refresh'}
          disabled={isFetching}
          onClick={() => refetch()}
        />
      </Flex>

      <Box id="org-panel" aria-labelledby={`org-${current.id}`}>
        <Grid gridTemplateColumns={[1, 1, 2, 3]} gap={3}>
          {current.projects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
          ))}
        </Grid>
      </Box>
    </Stack>
  )
}
