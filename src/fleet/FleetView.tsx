/**
 * The project list for whatever scope is selected.
 *
 * A table rather than cards: the question is comparative — who has the most
 * drafts waiting, what has gone longest untouched — and ranking eighteen
 * projects is what a sortable column does well and a grid of cards does not.
 */
import {SearchIcon} from '@sanity/icons/Search'
import {useProjects} from '@sanity/sdk-react'
import {Box, Button, Card, Checkbox, Flex, Inline, Select, Stack, Text, TextInput} from '@sanity/ui'
import {useState, type JSX} from 'react'
import {usePrefs} from '../lib/PrefsContext'
import type {QueryableProject} from '../lib/projects'
import {ProjectTable} from './ProjectTable'
import {SignalsProvider} from './SignalsStore'

interface FleetViewProps {
  projects: QueryableProject[]
  onOpenProject: (projectId: string) => void
}

export function FleetView({projects, onOpenProject}: FleetViewProps): JSX.Element {
  const {prefs, update} = usePrefs()
  const {isFetching, refetch} = useProjects()
  const [filter, setFilter] = useState('')

  return (
    <SignalsProvider projects={projects}>
      <Stack gap={4}>
        <Flex align="center" gap={3} wrap="wrap">
          <Box style={{width: 220}}>
            <TextInput
              fontSize={1}
              icon={SearchIcon}
              placeholder="Filter projects"
              radius={2}
              value={filter}
              onChange={(event) => setFilter(event.currentTarget.value)}
              onClear={() => setFilter('')}
              clearButton={filter.length > 0}
            />
          </Box>

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

          <Box flex={1} />

          <Button
            fontSize={1}
            mode="bleed"
            text={isFetching ? 'Refreshing…' : 'Refresh'}
            disabled={isFetching}
            onClick={() => refetch()}
          />
        </Flex>

        <Card radius={3} shadow={1} style={{overflow: 'hidden'}}>
          <ProjectTable projects={projects} filter={filter} onOpenProject={onOpenProject} />
        </Card>
      </Stack>
    </SignalsProvider>
  )
}
